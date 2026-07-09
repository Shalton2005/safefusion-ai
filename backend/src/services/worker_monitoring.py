"""Worker monitoring service for operational status snapshots."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol

from src.models.enums import PermitStatus, WorkerStatus
from src.models.permit import Permit
from src.models.worker import Worker


class WorkerMonitoringWorkerRepositoryPort(Protocol):
    """Worker repository contract required by ``WorkerMonitoringService``."""

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Worker]: ...


class WorkerMonitoringPermitRepositoryPort(Protocol):
    """Permit repository contract required by ``WorkerMonitoringService``."""

    def get_active(self) -> list[Permit]: ...


class WorkerMonitoringService:
    """Orchestrates worker monitoring summary from worker + permit data."""

    def __init__(
        self,
        worker_repository: WorkerMonitoringWorkerRepositoryPort,
        permit_repository: WorkerMonitoringPermitRepositoryPort,
    ) -> None:
        self._worker_repository = worker_repository
        self._permit_repository = permit_repository

    def get_monitoring_summary(self) -> dict:
        """Return structured monitoring summary for current workers."""
        workers = self._worker_repository.get_all(skip=0, limit=10_000)
        active_permits = self._permit_repository.get_active()

        active_permit_by_zone: dict[str, Permit] = {}
        for permit in sorted(active_permits, key=lambda p: p.start_time):
            if permit.status != PermitStatus.ACTIVE:
                continue
            if permit.zone not in active_permit_by_zone:
                active_permit_by_zone[permit.zone] = permit

        counts = self._empty_counts()
        workers_with_active_permit = 0
        monitoring_rows: list[dict] = []

        for worker in workers:
            self._increment_status_count(counts, worker.status)

            zone = worker.current_zone
            permit = active_permit_by_zone.get(zone) if zone else None
            if permit is not None:
                workers_with_active_permit += 1

            monitoring_rows.append(
                {
                    "worker_id": worker.id,
                    "employee_id": worker.employee_id,
                    "name": worker.name,
                    "assigned_zone": zone,
                    "simulated_location": self._simulate_location(worker),
                    "active_permit_id": permit.id if permit else None,
                    "active_permit_type": permit.permit_type.value if permit else None,
                    "shift": worker.shift,
                    # Explicit placeholder so this can later be sourced from real PPE telemetry.
                    "ppe_status_placeholder": worker.ppe_status,
                    "current_status": worker.status,
                }
            )

        monitoring_rows.sort(key=lambda item: (item["assigned_zone"] or "", item["employee_id"]))

        return {
            "generated_at": datetime.now(timezone.utc),
            "total_workers": len(workers),
            "workers_with_active_permit": workers_with_active_permit,
            "counts": counts,
            "workers": monitoring_rows,
        }

    @staticmethod
    def _simulate_location(worker: Worker) -> str:
        """Return deterministic location text until live tracking is integrated."""
        if worker.current_zone:
            return f"{worker.current_zone}-checkpoint"
        return "unassigned-checkpoint"

    @staticmethod
    def _empty_counts() -> dict[str, int]:
        return {"working": 0, "idle": 0, "emergency": 0, "total": 0}

    @staticmethod
    def _increment_status_count(counts: dict[str, int], status: WorkerStatus) -> None:
        if status == WorkerStatus.WORKING:
            counts["working"] += 1
        elif status == WorkerStatus.IDLE:
            counts["idle"] += 1
        elif status == WorkerStatus.EMERGENCY:
            counts["emergency"] += 1
        counts["total"] += 1