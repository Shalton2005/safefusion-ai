"""Graph Knowledge Agent — structured relationship lookups from the Neo4j knowledge graph.

Thin adapter around :class:`~src.services.graph_query.GraphQueryService`,
reached through the narrow :class:`GraphKnowledgePort` rather than the
concrete class — the same seam every agent in this package uses.

Graph querying is kept strictly separate from reasoning:

    - **Querying** (:class:`GraphKnowledgePort`) is a 1:1 mirror of
      :class:`~src.services.graph_query.GraphQueryService`'s own public
      methods. This module writes no Cypher and adds no new repository
      calls — every lookup it performs already exists in
      ``src/services/graph_query.py`` / ``src/repositories/graph_query.py``.
    - **Reasoning** lives entirely in :func:`_select_lookups` and
      :func:`_build_result`: deciding *which* of the existing lookups a
      request needs (based on which entity ids are supplied, and which
      relationship-category keywords appear in the request text), and
      sorting already-structured query results into the four requested
      relationship categories. No traversal decision is ever made here —
      only categorization of results the port already returned.

No LLM call. No FastAPI import anywhere in this module.

``run()``'s ``except Exception`` also catches
:class:`~src.repositories.graph_exceptions.GraphUnavailableError`
(raised by :class:`~src.repositories.graph_query.GraphQueryRepository`
when Neo4j is unreachable, times out, or errors — see that module) the
same way it catches any other lookup failure: as a degraded
:class:`~src.ai.agents.base.AgentResult`, never a crash.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from src.ai.agents.base import AgentRequest, AgentResult
from src.utils.logger import get_logger

logger = get_logger(__name__)


# ── Engine port ───────────────────────────────────────────────────────────────


class GraphKnowledgePort(Protocol):
    """Contract required from the graph query service.

    Mirrors :class:`~src.services.graph_query.GraphQueryService` exactly
    — this agent calls these methods and only these methods; it never
    issues its own graph traversal.
    """

    def list_workers(self) -> dict[str, Any]: ...
    def list_zones(self) -> dict[str, Any]: ...
    def list_permits(self) -> dict[str, Any]: ...
    def list_incidents(self) -> dict[str, Any]: ...
    def list_risks(self) -> dict[str, Any]: ...
    def workers_by_zone(self, zone_id: str) -> dict[str, Any]: ...
    def permits_by_worker(self, worker_id: str) -> dict[str, Any]: ...
    def incidents_by_equipment(self, equipment_id: str) -> dict[str, Any]: ...
    def sensors_by_zone(self, zone_id: str) -> dict[str, Any]: ...
    def risks_by_incident(self, incident_id: str) -> dict[str, Any]: ...


# ── Result shape ──────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class GraphRelationship:
    """One relationship-query result, carried as structured data (never prose).

    Attributes:
        query: Name of the underlying graph query that produced this
            record (e.g. ``"workers_by_zone"``) — traceable back to
            :class:`~src.services.graph_query.GraphQueryService`.
        record: The raw node/record dict as returned by the graph query
            service. Left unshaped (beyond the envelope) since node
            properties are dynamic — see
            ``src/schemas/response/graph_query.py`` for why the rest of
            the codebase makes the same choice.
    """

    query: str
    record: dict[str, Any]


@dataclass(frozen=True, slots=True)
class GraphKnowledgeResult:
    """Structured graph relationships relevant to a user query, grouped by category."""

    worker_relationships: list[GraphRelationship] = field(default_factory=list)
    equipment_relationships: list[GraphRelationship] = field(default_factory=list)
    zone_relationships: list[GraphRelationship] = field(default_factory=list)
    incident_history: list[GraphRelationship] = field(default_factory=list)

    @property
    def total_count(self) -> int:
        return (
            len(self.worker_relationships)
            + len(self.equipment_relationships)
            + len(self.zone_relationships)
            + len(self.incident_history)
        )


# ── Category keyword table ───────────────────────────────────────────────────

# Which relationship categories a request's free text implies, when no
# explicit entity id narrows the lookup. Data, not branching logic — add
# a category by adding an entry, following the same pattern as
# ``src.ai.agents.routing.default_keyword_routes``.
_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "worker": ("worker", "employee", "staff", "personnel"),
    "equipment": ("equipment", "machine", "asset"),
    "zone": ("zone", "area", "location"),
    "incident": ("incident", "history", "past event", "occurred"),
}


class GraphKnowledgeAgent:
    """Reports worker, equipment, zone, and incident-history relationships from the knowledge graph."""

    def __init__(self, graph_engine: GraphKnowledgePort) -> None:
        self._graph_engine = graph_engine

    @property
    def name(self) -> str:
        return "graph_knowledge"

    def run(self, request: AgentRequest) -> AgentResult:
        try:
            result = _build_result(self._graph_engine, request)
        except Exception as exc:  # noqa: BLE001 - one agent's failure must not abort the others
            logger.warning("Graph Knowledge agent failed: %s", exc)
            return AgentResult(agent=self.name, summary="", error=str(exc))

        if result.total_count == 0:
            return AgentResult(agent=self.name, summary="No relevant graph relationships found.", data=result)

        summary = (
            f"Found {result.total_count} relevant relationship(s): "
            f"{len(result.worker_relationships)} worker, "
            f"{len(result.equipment_relationships)} equipment, "
            f"{len(result.zone_relationships)} zone, "
            f"{len(result.incident_history)} incident."
        )
        return AgentResult(agent=self.name, summary=summary, data=result)


# Which relationship category an explicitly supplied entity id implies
# is relevant, independent of the request's wording — e.g. a caller
# that already knows a ``zone_id`` clearly wants zone-scoped results
# even if the text doesn't contain a "zone" keyword.
_CATEGORY_PARAMS: dict[str, str] = {
    "worker": "worker_id",
    "equipment": "equipment_id",
    "zone": "zone_id",
    "incident": "incident_id",
}


def _select_categories(text: str, params: dict[str, Any]) -> set[str]:
    """Decide which relationship categories a request implies.

    Pure classification — no graph access. A category is selected if
    either its keywords appear in ``text`` or its entity id is present
    in ``params`` (params always win regardless of phrasing, since a
    supplied id is an explicit, unambiguous signal). Returns every
    category if neither text nor params match anything, so an
    unclassifiable query still returns the full picture rather than
    nothing. ``zone_id`` also implies the worker category, since
    "workers by zone" is the primary worker-relationship lookup
    (see :func:`_build_result`).
    """
    lowered = text.lower()
    matched = {category for category, keywords in _CATEGORY_KEYWORDS.items() if any(k in lowered for k in keywords)}
    matched |= {category for category, param_name in _CATEGORY_PARAMS.items() if params.get(param_name)}
    if params.get("zone_id"):
        matched.add("worker")
    return matched or set(_CATEGORY_KEYWORDS.keys())


def _build_result(engine: GraphKnowledgePort, request: AgentRequest) -> GraphKnowledgeResult:
    """Assemble a :class:`GraphKnowledgeResult` from existing graph query lookups.

    Entity ids in ``request.params`` (``zone_id``, ``worker_id``,
    ``equipment_id``, ``incident_id``) drive relationship-specific
    lookups when present; otherwise falls back to flat listings scoped
    by which categories :func:`_select_categories` decided are relevant.
    Every call here is a pass-through to ``engine`` — no traversal
    decision is made below the method-selection level.
    """
    categories = _select_categories(request.text, request.params)
    zone_id = request.params.get("zone_id")
    worker_id = request.params.get("worker_id")
    equipment_id = request.params.get("equipment_id")
    incident_id = request.params.get("incident_id")

    worker_relationships: list[GraphRelationship] = []
    equipment_relationships: list[GraphRelationship] = []
    zone_relationships: list[GraphRelationship] = []
    incident_history: list[GraphRelationship] = []

    if "worker" in categories:
        if zone_id:
            worker_relationships += _to_relationships(engine.workers_by_zone(zone_id))
        else:
            worker_relationships += _to_relationships(engine.list_workers())
        if worker_id:
            worker_relationships += _to_relationships(engine.permits_by_worker(worker_id))

    if "equipment" in categories and equipment_id:
        # No flat equipment listing exists on GraphQueryService today —
        # incidents_by_equipment is the only equipment-relationship
        # lookup it exposes (see that method's docstring for the known
        # ingestion gap that currently makes it return no results).
        equipment_relationships += _to_relationships(engine.incidents_by_equipment(equipment_id))

    if "zone" in categories:
        if zone_id:
            zone_relationships += _to_relationships(engine.sensors_by_zone(zone_id))
        else:
            zone_relationships += _to_relationships(engine.list_zones())

    if "incident" in categories:
        if incident_id:
            incident_history += _to_relationships(engine.risks_by_incident(incident_id))
        else:
            incident_history += _to_relationships(engine.list_incidents())

    return GraphKnowledgeResult(
        worker_relationships=worker_relationships,
        equipment_relationships=equipment_relationships,
        zone_relationships=zone_relationships,
        incident_history=incident_history,
    )


def _to_relationships(query_result: dict[str, Any]) -> list[GraphRelationship]:
    """Convert one ``GraphQueryService`` envelope (``{query, count, records}``) into ``GraphRelationship`` entries."""
    query = query_result.get("query", "")
    return [GraphRelationship(query=query, record=record) for record in query_result.get("records", [])]
