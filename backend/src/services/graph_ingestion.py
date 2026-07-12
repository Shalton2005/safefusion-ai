"""
Graph ingestion service for SafeFusion AI.

Reads entities from PostgreSQL (via the existing repository layer) and
projects them into the Neo4j knowledge graph defined in
``docs/knowledge-graph-schema.md``: one node per entity, plus the
relationships connecting them (mostly through the shared ``Zone`` hub).

Every write goes through :meth:`~src.repositories.graph_base.GraphBaseRepository.merge_node`
and :meth:`~src.repositories.graph_base.GraphBaseRepository.merge_relationship`,
both implemented with Cypher ``MERGE``. Re-running :meth:`GraphIngestionService.run`
is always safe: existing nodes/relationships are matched by their stable
PostgreSQL ``id`` (or, for ``Zone``, by zone code) and updated in place, so
ingestion is both duplicate-free and incremental — a full run after new
Postgres rows have been added only creates what's new and refreshes what
changed.

No knowledge-graph *query* logic (traversals, compound-risk detection,
etc.) lives here — this service only keeps the graph in sync with
PostgreSQL, per the current project scope.
"""

from __future__ import annotations

from typing import Protocol

from src.models.incident import Incident
from src.models.maintenance import MaintenanceLog
from src.models.permit import Permit
from src.models.risk_score import RiskScore
from src.models.sensor import Sensor
from src.models.worker import Worker
from src.repositories.graph_base import GraphBaseRepository
from src.utils.logger import get_logger


logger = get_logger(__name__)


# ── Repository ports (PostgreSQL side) ──────────────────────────────────────
# Protocol contracts, not concrete repository classes, so this service can be
# tested against fakes and stays decoupled from the SQLAlchemy repositories —
# same pattern as WorkerMonitoringService's repository ports.

class GraphIngestionWorkerRepositoryPort(Protocol):
    def get_all(self, skip: int = 0, limit: int = 100) -> list[Worker]: ...


class GraphIngestionSensorRepositoryPort(Protocol):
    def get_all(self, skip: int = 0, limit: int = 100) -> list[Sensor]: ...


class GraphIngestionPermitRepositoryPort(Protocol):
    def get_all(self, skip: int = 0, limit: int = 100) -> list[Permit]: ...


class GraphIngestionMaintenanceRepositoryPort(Protocol):
    def get_all(self, skip: int = 0, limit: int = 100) -> list[MaintenanceLog]: ...


class GraphIngestionIncidentRepositoryPort(Protocol):
    def get_all(self, skip: int = 0, limit: int = 100) -> list[Incident]: ...


class GraphIngestionRiskScoreRepositoryPort(Protocol):
    def get_all(self, skip: int = 0, limit: int = 100) -> list[RiskScore]: ...


# ── Service ──────────────────────────────────────────────────────────────────

_INGEST_BATCH_SIZE = 10_000
"""Upper bound passed to each repository's ``get_all(limit=...)``.

The existing repositories only expose offset/limit pagination, not an
unbounded fetch-all. A single large limit is sufficient for this dataset's
scale; if entity volume grows enough to matter, this service is the layer
to introduce cursor-based batching in — call sites elsewhere don't change.
"""


class GraphIngestionService:
    """Synchronises PostgreSQL entities into the Neo4j knowledge graph.

    Args:
        graph_repository: Neo4j write primitives (``MERGE``-based).
        worker_repository: Source of ``Worker`` rows.
        sensor_repository: Source of ``Sensor`` rows.
        permit_repository: Source of ``Permit`` rows.
        maintenance_repository: Source of ``MaintenanceLog`` rows.
        incident_repository: Source of ``Incident`` rows.
        risk_score_repository: Source of ``RiskScore`` rows.
    """

    def __init__(
        self,
        graph_repository: GraphBaseRepository,
        worker_repository: GraphIngestionWorkerRepositoryPort,
        sensor_repository: GraphIngestionSensorRepositoryPort,
        permit_repository: GraphIngestionPermitRepositoryPort,
        maintenance_repository: GraphIngestionMaintenanceRepositoryPort,
        incident_repository: GraphIngestionIncidentRepositoryPort,
        risk_score_repository: GraphIngestionRiskScoreRepositoryPort,
    ) -> None:
        self._graph = graph_repository
        self._worker_repository = worker_repository
        self._sensor_repository = sensor_repository
        self._permit_repository = permit_repository
        self._maintenance_repository = maintenance_repository
        self._incident_repository = incident_repository
        self._risk_score_repository = risk_score_repository

    # ── Orchestration ────────────────────────────────────────────────────────

    def run(self) -> dict[str, int]:
        """Ingest every entity type into the graph and return per-type counts.

        Zones are merged first (derived from every other entity's ``zone``
        field, since PostgreSQL has no standalone zones table) so that the
        relationship-merge step can always find its ``Zone`` endpoint.
        Equipment nodes are derived from maintenance logs for the same
        reason — there is no standalone equipment table.

        Returns:
            A mapping of entity type name to the number of rows ingested,
            e.g. ``{"workers": 12, "sensors": 40, "zones": 6, ...}``.
        """
        workers = self._worker_repository.get_all(skip=0, limit=_INGEST_BATCH_SIZE)
        sensors = self._sensor_repository.get_all(skip=0, limit=_INGEST_BATCH_SIZE)
        permits = self._permit_repository.get_all(skip=0, limit=_INGEST_BATCH_SIZE)
        maintenance_logs = self._maintenance_repository.get_all(skip=0, limit=_INGEST_BATCH_SIZE)
        incidents = self._incident_repository.get_all(skip=0, limit=_INGEST_BATCH_SIZE)
        risk_scores = self._risk_score_repository.get_all(skip=0, limit=_INGEST_BATCH_SIZE)

        zone_codes = self._collect_zone_codes(workers, sensors, permits, incidents, risk_scores)
        for zone_code in zone_codes:
            self._merge_zone(zone_code)

        for worker in workers:
            self._merge_worker(worker)
        for sensor in sensors:
            self._merge_sensor(sensor)
        for permit in permits:
            self._merge_permit(permit)
        for maintenance_log in maintenance_logs:
            self._merge_maintenance(maintenance_log)
        for incident in incidents:
            self._merge_incident(incident)
        for risk_score in risk_scores:
            self._merge_risk_score(risk_score)

        counts = {
            "zones": len(zone_codes),
            "workers": len(workers),
            "sensors": len(sensors),
            "permits": len(permits),
            "equipment": len({log.equipment_id for log in maintenance_logs}),
            "maintenance": len(maintenance_logs),
            "incidents": len(incidents),
            "risk_scores": len(risk_scores),
        }
        logger.info("Graph ingestion complete counts=%s", counts)
        return counts

    # ── Zone (derived hub) ───────────────────────────────────────────────────

    @staticmethod
    def _collect_zone_codes(
        workers: list[Worker],
        sensors: list[Sensor],
        permits: list[Permit],
        incidents: list[Incident],
        risk_scores: list[RiskScore],
    ) -> list[str]:
        """Return every distinct zone code referenced across the ingested entities."""
        codes: set[str] = set()
        codes.update(worker.current_zone for worker in workers if worker.current_zone)
        codes.update(sensor.zone for sensor in sensors)
        codes.update(permit.zone for permit in permits)
        codes.update(incident.zone for incident in incidents)
        codes.update(risk_score.zone for risk_score in risk_scores)
        return sorted(codes)

    def _merge_zone(self, zone_code: str) -> None:
        self._graph.merge_node(
            label="Zone",
            key="id",
            key_value=zone_code,
            properties={"id": zone_code, "name": zone_code},
        )

    # ── Node merges ───────────────────────────────────────────────────────────

    def _merge_worker(self, worker: Worker) -> None:
        worker_id = str(worker.id)
        self._graph.merge_node(
            label="Worker",
            key="id",
            key_value=worker_id,
            properties={
                "id": worker_id,
                "employee_id": worker.employee_id,
                "name": worker.name,
                "department": worker.department,
                "role": worker.role,
                "shift": worker.shift,
                "ppe_status": worker.ppe_status,
                "status": worker.status.value,
            },
        )
        if worker.current_zone:
            self._graph.merge_relationship(
                from_label="Worker",
                from_key="id",
                from_key_value=worker_id,
                to_label="Zone",
                to_key="id",
                to_key_value=worker.current_zone,
                relationship_type="LOCATED_IN",
            )

    def _merge_sensor(self, sensor: Sensor) -> None:
        sensor_id = str(sensor.id)
        self._graph.merge_node(
            label="Sensor",
            key="id",
            key_value=sensor_id,
            properties={
                "id": sensor_id,
                "sensor_type": sensor.sensor_type.value,
                "value": sensor.value,
                "unit": sensor.unit,
                "status": sensor.status.value,
                "timestamp": sensor.timestamp.isoformat(),
            },
        )
        self._graph.merge_relationship(
            from_label="Sensor",
            from_key="id",
            from_key_value=sensor_id,
            to_label="Zone",
            to_key="id",
            to_key_value=sensor.zone,
            relationship_type="MONITORS",
        )

    def _merge_permit(self, permit: Permit) -> None:
        permit_id = str(permit.id)
        self._graph.merge_node(
            label="Permit",
            key="id",
            key_value=permit_id,
            properties={
                "id": permit_id,
                "permit_type": permit.permit_type.value,
                "status": permit.status.value,
                "issued_by": permit.issued_by,
                "assigned_team": permit.assigned_team,
                "start_time": permit.start_time.isoformat(),
                "end_time": permit.end_time.isoformat(),
            },
        )
        self._graph.merge_relationship(
            from_label="Permit",
            from_key="id",
            from_key_value=permit_id,
            to_label="Zone",
            to_key="id",
            to_key_value=permit.zone,
            relationship_type="ISSUED_FOR",
        )

    def _merge_maintenance(self, maintenance_log: MaintenanceLog) -> None:
        maintenance_id = str(maintenance_log.id)
        self._graph.merge_node(
            label="Equipment",
            key="id",
            key_value=maintenance_log.equipment_id,
            properties={
                "id": maintenance_log.equipment_id,
                "name": maintenance_log.equipment_name,
            },
        )
        self._graph.merge_node(
            label="Maintenance",
            key="id",
            key_value=maintenance_id,
            properties={
                "id": maintenance_id,
                "maintenance_type": maintenance_log.maintenance_type.value,
                "status": maintenance_log.status.value,
                "assigned_team": maintenance_log.assigned_team,
                "start_time": maintenance_log.start_time.isoformat() if maintenance_log.start_time else None,
                "end_time": maintenance_log.end_time.isoformat() if maintenance_log.end_time else None,
            },
        )
        self._graph.merge_relationship(
            from_label="Maintenance",
            from_key="id",
            from_key_value=maintenance_id,
            to_label="Equipment",
            to_key="id",
            to_key_value=maintenance_log.equipment_id,
            relationship_type="PERFORMED_ON",
        )

    def _merge_incident(self, incident: Incident) -> None:
        incident_id = str(incident.id)
        self._graph.merge_node(
            label="Incident",
            key="id",
            key_value=incident_id,
            properties={
                "id": incident_id,
                "incident_type": incident.incident_type.value,
                "severity": incident.severity.value,
                "description": incident.description,
                "root_cause": incident.root_cause,
                "occurred_at": incident.occurred_at.isoformat(),
            },
        )
        self._graph.merge_relationship(
            from_label="Incident",
            from_key="id",
            from_key_value=incident_id,
            to_label="Zone",
            to_key="id",
            to_key_value=incident.zone,
            relationship_type="OCCURRED_IN",
        )

    def _merge_risk_score(self, risk_score: RiskScore) -> None:
        risk_id = str(risk_score.id)
        self._graph.merge_node(
            label="Risk",
            key="id",
            key_value=risk_id,
            properties={
                "id": risk_id,
                "risk_score": risk_score.risk_score,
                "risk_level": risk_score.risk_level.value,
                "contributing_factors": risk_score.contributing_factors,
                "analyzed_at": risk_score.analyzed_at.isoformat(),
            },
        )
        self._graph.merge_relationship(
            from_label="Risk",
            from_key="id",
            from_key_value=risk_id,
            to_label="Zone",
            to_key="id",
            to_key_value=risk_score.zone,
            relationship_type="ASSESSES",
        )
