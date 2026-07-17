"""
Graph query repository for SafeFusion AI.

Read-only Cypher traversals over the knowledge graph defined in
``docs/knowledge-graph-schema.md``, one focused method per query — no
method combines more than one traversal, so each stays easy to reason
about and reuse independently (modular per method, not one big query).

Three of the five queries below depend on relationships that
``GraphIngestionService`` (``src/services/graph_ingestion.py``) does not
currently write, because the underlying PostgreSQL data has no path to
derive them from. These are **known, currently-broken/degraded query
paths**, not stylistic choices — read each method's docstring before
relying on it:

- **Permits by Worker** (:meth:`get_permits_by_worker`) — degrades to a
  zone-level approximation (returns non-empty results, but over-broad:
  every permit in the worker's zone, not permits specific to that worker).
- **Incidents by Equipment** (:meth:`get_incidents_by_equipment`) —
  **always returns an empty list**. ``MaintenanceLog`` has no ``zone``
  column in PostgreSQL, so ``Equipment`` nodes are never given a
  ``LOCATED_IN`` edge to any ``Zone`` at all; the query's own zone-mediated
  ``MATCH`` can never bind. Fixing this requires a PostgreSQL schema
  change (adding a zone/location reference to ``maintenance_logs``) —
  out of scope for the graph layer alone.
- **Risks by Incident** (:meth:`get_risks_by_incident`) — **always
  returns an empty list**. ``GraphIngestionService`` never writes an
  ``Incident-[:TRIGGERED_BY]->Risk`` edge (only ``Risk-[:ASSESSES]->Zone``
  exists); PostgreSQL's ``Incident``/``RiskScore`` tables have no foreign
  key linking a specific incident to the risk assessment that preceded it,
  only a shared ``zone``. Fixing this requires either that FK or an
  explicit zone-and-time-window join at ingestion time.

Every method returns plain ``dict``/``list[dict]`` structures built from
Neo4j ``Record`` objects — never a driver-native ``Node``/``Relationship``
— so callers (the service layer) can serialize the result directly to
JSON without depending on Neo4j types.

Every query below runs through :meth:`GraphQueryRepository._run`, which
applies a per-query timeout (``settings.NEO4J_QUERY_TIMEOUT_SECONDS``,
via :class:`neo4j.Query`), times it (``operation=graph_query``, via
:func:`~src.utils.timing.timed`), and converts any driver failure —
connection refused, query timeout, session expired — into
:class:`~src.repositories.graph_exceptions.GraphUnavailableError`.
Callers (the Graph Knowledge agent, via
:class:`~src.ai.exceptions.GraphUnavailableError`, which re-exports this
same type) catch that one type instead of importing
``neo4j.exceptions`` themselves. :class:`~src.repositories.graph_base.GraphBaseRepository`'s
own ``list_nodes``/``merge_node``/etc. are deliberately left untouched —
this timeout/error-wrapping/timing behavior belongs to the read-only
AI-facing query path, not the shared write/ingestion primitives those
methods also serve.
"""

from typing import Any

import neo4j.exceptions
from neo4j import Query

from src.config.settings import settings
from src.repositories.graph_base import GraphBaseRepository
from src.repositories.graph_exceptions import GraphUnavailableError
from src.utils.logger import get_logger
from src.utils.timing import timed

logger = get_logger(__name__)


class GraphQueryRepository(GraphBaseRepository):
    """Read-only knowledge-graph queries backed by a Neo4j session."""

    def _run(self, cypher: str, **parameters: Any) -> list[neo4j.Record]:
        """Run one bounded, timed Cypher query, converting driver failures to :class:`GraphUnavailableError`.

        Every query method below goes through this instead of calling
        ``self._session.run`` directly, so a Neo4j outage — and its
        latency — is handled once here rather than once per method.
        """
        query = Query(cypher, timeout=settings.NEO4J_QUERY_TIMEOUT_SECONDS)
        try:
            with timed(logger, "graph_query"):
                result = self._session.run(query, **parameters)
                return list(result)
        except neo4j.exceptions.Neo4jError as exc:
            logger.warning("Neo4j query failed: %s", exc)
            raise GraphUnavailableError(f"Neo4j query failed: {exc}") from exc
        except neo4j.exceptions.DriverError as exc:
            logger.warning("Neo4j unreachable: %s", exc)
            raise GraphUnavailableError(f"Neo4j unreachable: {exc}") from exc

    # ── Flat entity listings ─────────────────────────────────────────────────
    # One label per method so each collection endpoint stays a single,
    # independent lookup — mirrors GraphBaseRepository.list_nodes but
    # routed through _run for the timeout/error handling above.

    def list_workers(self) -> list[dict[str, Any]]:
        """Return every worker node in the graph."""
        return self._list_label("Worker")

    def list_zones(self) -> list[dict[str, Any]]:
        """Return every zone node in the graph."""
        return self._list_label("Zone")

    def list_permits(self) -> list[dict[str, Any]]:
        """Return every permit node in the graph."""
        return self._list_label("Permit")

    def list_incidents(self) -> list[dict[str, Any]]:
        """Return every incident node in the graph."""
        return self._list_label("Incident")

    def list_risks(self) -> list[dict[str, Any]]:
        """Return every risk assessment node in the graph."""
        return self._list_label("Risk")

    def _list_label(self, label: str, limit: int = 1_000) -> list[dict[str, Any]]:
        result = self._run(f"MATCH (n:{label}) RETURN n AS node LIMIT $limit", limit=limit)
        return [dict(record["node"]) for record in result]

    # ── Workers by Zone ──────────────────────────────────────────────────────

    def get_workers_by_zone(self, zone_id: str) -> list[dict[str, Any]]:
        """Return every worker currently located in the given zone."""
        result = self._run(
            "MATCH (w:Worker)-[:LOCATED_IN]->(z:Zone {id: $zone_id}) "
            "RETURN w AS worker "
            "ORDER BY w.employee_id",
            zone_id=zone_id,
        )
        return [dict(record["worker"]) for record in result]

    # ── Permits by Worker ────────────────────────────────────────────────────

    def get_permits_by_worker(self, worker_id: str) -> list[dict[str, Any]]:
        """Return permits issued for the worker's current zone.

        Zone-mediated approximation, not a worker-specific relationship —
        see module docstring. Returns every permit in the worker's zone,
        which may include permits unrelated to this worker's actual task
        or team. Returns an empty list if the worker has no ``current_zone``
        set.
        """
        result = self._run(
            "MATCH (w:Worker {id: $worker_id})-[:LOCATED_IN]->(z:Zone) "
            "MATCH (p:Permit)-[:ISSUED_FOR]->(z) "
            "RETURN p AS permit "
            "ORDER BY p.start_time DESC",
            worker_id=worker_id,
        )
        return [dict(record["permit"]) for record in result]

    # ── Incidents by Equipment ───────────────────────────────────────────────

    def get_incidents_by_equipment(self, equipment_id: str) -> list[dict[str, Any]]:
        """Return incidents that occurred in the equipment's zone.

        ALWAYS RETURNS AN EMPTY LIST today — see module docstring.
        ``Equipment`` nodes have no ``LOCATED_IN`` edge to any ``Zone`` in
        the current ingested graph (``MaintenanceLog`` has no PostgreSQL
        ``zone`` column), so this query's first ``MATCH`` clause can never
        bind. Requires a PostgreSQL schema change to fix.
        """
        result = self._run(
            "MATCH (e:Equipment {id: $equipment_id})-[:LOCATED_IN]->(z:Zone) "
            "MATCH (i:Incident)-[:OCCURRED_IN]->(z) "
            "RETURN i AS incident "
            "ORDER BY i.occurred_at DESC",
            equipment_id=equipment_id,
        )
        return [dict(record["incident"]) for record in result]

    # ── Sensors by Zone ───────────────────────────────────────────────────────

    def get_sensors_by_zone(self, zone_id: str) -> list[dict[str, Any]]:
        """Return every sensor monitoring the given zone."""
        result = self._run(
            "MATCH (s:Sensor)-[:MONITORS]->(z:Zone {id: $zone_id}) "
            "RETURN s AS sensor "
            "ORDER BY s.sensor_type",
            zone_id=zone_id,
        )
        return [dict(record["sensor"]) for record in result]

    # ── Risks by Incident ────────────────────────────────────────────────────

    def get_risks_by_incident(self, incident_id: str) -> list[dict[str, Any]]:
        """Return the risk assessment(s) that triggered the given incident.

        ALWAYS RETURNS AN EMPTY LIST today — see module docstring.
        ``GraphIngestionService`` never writes an ``Incident-[:TRIGGERED_BY]->Risk``
        edge; ``Incident`` and ``Risk`` are only ever linked indirectly, via
        their shared ``Zone``. Requires either a PostgreSQL foreign key from
        incident to the risk assessment that preceded it, or an explicit
        zone-and-time-window join at ingestion time.
        """
        result = self._run(
            "MATCH (i:Incident {id: $incident_id})-[:TRIGGERED_BY]->(r:Risk) "
            "RETURN r AS risk "
            "ORDER BY r.analyzed_at DESC",
            incident_id=incident_id,
        )
        return [dict(record["risk"]) for record in result]
