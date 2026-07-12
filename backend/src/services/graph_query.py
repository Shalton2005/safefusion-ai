"""
Graph query service for SafeFusion AI.

Thin orchestration layer over :class:`~src.repositories.graph_query.GraphQueryRepository`:
each method calls exactly one repository traversal and wraps the result in
a small, self-describing structure (query name, the lookup key used, a
count, and the matched records) so every endpoint built on this service
returns consistent, structured JSON — no method combines multiple
traversals, keeping each query independently reusable.

No new Cypher lives here; this layer only shapes repository output for
callers (routes, other services, future report generators).
"""

from __future__ import annotations

from typing import Any, Protocol


class GraphQueryRepositoryPort(Protocol):
    """Repository contract required by ``GraphQueryService``."""

    def list_workers(self) -> list[dict[str, Any]]: ...
    def list_zones(self) -> list[dict[str, Any]]: ...
    def list_permits(self) -> list[dict[str, Any]]: ...
    def list_incidents(self) -> list[dict[str, Any]]: ...
    def list_risks(self) -> list[dict[str, Any]]: ...
    def get_workers_by_zone(self, zone_id: str) -> list[dict[str, Any]]: ...
    def get_permits_by_worker(self, worker_id: str) -> list[dict[str, Any]]: ...
    def get_incidents_by_equipment(self, equipment_id: str) -> list[dict[str, Any]]: ...
    def get_sensors_by_zone(self, zone_id: str) -> list[dict[str, Any]]: ...
    def get_risks_by_incident(self, incident_id: str) -> list[dict[str, Any]]: ...


class GraphQueryService:
    """Exposes reusable knowledge-graph lookups as structured JSON-ready dicts.

    Args:
        repository: Read-only graph query repository.
    """

    def __init__(self, repository: GraphQueryRepositoryPort) -> None:
        self._repository = repository

    def list_workers(self) -> dict[str, Any]:
        """Return every worker in the graph."""
        records = self._repository.list_workers()
        return self._envelope("workers", records)

    def list_zones(self) -> dict[str, Any]:
        """Return every zone in the graph."""
        records = self._repository.list_zones()
        return self._envelope("zones", records)

    def list_permits(self) -> dict[str, Any]:
        """Return every permit in the graph."""
        records = self._repository.list_permits()
        return self._envelope("permits", records)

    def list_incidents(self) -> dict[str, Any]:
        """Return every incident in the graph."""
        records = self._repository.list_incidents()
        return self._envelope("incidents", records)

    def list_risks(self) -> dict[str, Any]:
        """Return every risk assessment in the graph."""
        records = self._repository.list_risks()
        return self._envelope("risks", records)

    def workers_by_zone(self, zone_id: str) -> dict[str, Any]:
        """Return every worker currently located in ``zone_id``."""
        records = self._repository.get_workers_by_zone(zone_id)
        return self._envelope("workers_by_zone", records)

    def permits_by_worker(self, worker_id: str) -> dict[str, Any]:
        """Return permits related to the worker identified by ``worker_id``."""
        records = self._repository.get_permits_by_worker(worker_id)
        return self._envelope("permits_by_worker", records)

    def incidents_by_equipment(self, equipment_id: str) -> dict[str, Any]:
        """Return incidents affecting the equipment identified by ``equipment_id``."""
        records = self._repository.get_incidents_by_equipment(equipment_id)
        return self._envelope("incidents_by_equipment", records)

    def sensors_by_zone(self, zone_id: str) -> dict[str, Any]:
        """Return every sensor monitoring ``zone_id``."""
        records = self._repository.get_sensors_by_zone(zone_id)
        return self._envelope("sensors_by_zone", records)

    def risks_by_incident(self, incident_id: str) -> dict[str, Any]:
        """Return the risk assessment(s) connected to the given incident."""
        records = self._repository.get_risks_by_incident(incident_id)
        return self._envelope("risks_by_incident", records)

    @staticmethod
    def _envelope(query: str, records: list[dict[str, Any]]) -> dict[str, Any]:
        """Build the common structured-JSON envelope shared by every query method."""
        return {
            "query": query,
            "count": len(records),
            "records": records,
        }
