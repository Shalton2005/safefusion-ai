"""
Graph query repository for SafeFusion AI.

Read-only Cypher traversals over the knowledge graph defined in
``docs/knowledge-graph-schema.md``, one focused method per query — no
method combines more than one traversal, so each stays easy to reason
about and reuse independently (modular per method, not one big query).

Two of the five queries below traverse through ``Zone`` rather than a
direct edge, because the current ``GraphIngestionService``
(``src/services/graph_ingestion.py``) only ever writes zone-mediated
relationships — PostgreSQL has no ``worker_id`` foreign key on permits
and no direct equipment/incident link, so ``HAS_PERMIT`` and a direct
``Equipment``-``Incident`` edge (both shown in the schema doc) are not
actually present in the ingested graph yet:

- **Permits by Worker** uses ``Worker-[:LOCATED_IN]->Zone<-[:ISSUED_FOR]-Permit``
  (permits issued for the worker's current zone) as an approximation of
  "permits related to a worker" until a direct relationship is ingested.
- **Incidents by Equipment** uses ``Equipment-[:LOCATED_IN]->Zone<-[:OCCURRED_IN]-Incident``
  (incidents in the equipment's zone) for the same reason.

Every method returns plain ``dict``/``list[dict]`` structures built from
Neo4j ``Record`` objects — never a driver-native ``Node``/``Relationship``
— so callers (the service layer) can serialize the result directly to
JSON without depending on Neo4j types.
"""

from typing import Any

from src.repositories.graph_base import GraphBaseRepository


class GraphQueryRepository(GraphBaseRepository):
    """Read-only knowledge-graph queries backed by a Neo4j session."""

    # ── Flat entity listings ─────────────────────────────────────────────────
    # Thin wrappers over GraphBaseRepository.list_nodes — one label per method
    # so each collection endpoint stays a single, independent lookup.

    def list_workers(self) -> list[dict[str, Any]]:
        """Return every worker node in the graph."""
        return self.list_nodes("Worker")

    def list_zones(self) -> list[dict[str, Any]]:
        """Return every zone node in the graph."""
        return self.list_nodes("Zone")

    def list_permits(self) -> list[dict[str, Any]]:
        """Return every permit node in the graph."""
        return self.list_nodes("Permit")

    def list_incidents(self) -> list[dict[str, Any]]:
        """Return every incident node in the graph."""
        return self.list_nodes("Incident")

    def list_risks(self) -> list[dict[str, Any]]:
        """Return every risk assessment node in the graph."""
        return self.list_nodes("Risk")

    # ── Workers by Zone ──────────────────────────────────────────────────────

    def get_workers_by_zone(self, zone_id: str) -> list[dict[str, Any]]:
        """Return every worker currently located in the given zone."""
        result = self._session.run(
            "MATCH (w:Worker)-[:LOCATED_IN]->(z:Zone {id: $zone_id}) "
            "RETURN w AS worker "
            "ORDER BY w.employee_id",
            zone_id=zone_id,
        )
        return [dict(record["worker"]) for record in result]

    # ── Permits by Worker ────────────────────────────────────────────────────

    def get_permits_by_worker(self, worker_id: str) -> list[dict[str, Any]]:
        """Return permits issued for the worker's current zone.

        See module docstring — this is a zone-mediated approximation of
        "permits related to a worker" until a direct ``HAS_PERMIT`` edge
        is ingested.
        """
        result = self._session.run(
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

        See module docstring — this is a zone-mediated approximation of
        "incidents affecting equipment" until a direct equipment/incident
        edge is ingested.
        """
        result = self._session.run(
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
        result = self._session.run(
            "MATCH (s:Sensor)-[:MONITORS]->(z:Zone {id: $zone_id}) "
            "RETURN s AS sensor "
            "ORDER BY s.sensor_type",
            zone_id=zone_id,
        )
        return [dict(record["sensor"]) for record in result]

    # ── Risks by Incident ────────────────────────────────────────────────────

    def get_risks_by_incident(self, incident_id: str) -> list[dict[str, Any]]:
        """Return the risk assessment(s) that triggered the given incident."""
        result = self._session.run(
            "MATCH (i:Incident {id: $incident_id})-[:TRIGGERED_BY]->(r:Risk) "
            "RETURN r AS risk "
            "ORDER BY r.analyzed_at DESC",
            incident_id=incident_id,
        )
        return [dict(record["risk"]) for record in result]
