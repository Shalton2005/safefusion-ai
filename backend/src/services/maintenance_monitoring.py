"""Maintenance monitoring service: equipment-health signal from maintenance history.

There is no ``Equipment`` model in this codebase — ``MaintenanceLog`` only
carries ``equipment_id``/``equipment_name`` strings (see
``src.models.maintenance``), with no health/condition field of its own.
This service derives an equipment-health signal purely from maintenance
*history*: equipment currently under ONGOING corrective work, or with a
high ratio of corrective-to-total maintenance activity, is treated as
degraded. That derivation is exactly what ``CompoundRiskEngine``'s new
equipment-health rules (see ``src.services.compound_risk.rules``) consume.

Mirrors the shape of ``SensorMonitoringService``/``PermitValidationService``
(a ``get_monitoring_summary() -> dict`` built from repository rows) so it
slots into ``CompoundRiskService`` the same way the other three monitoring
ports already do.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from src.models.enums import MaintenanceStatus, MaintenanceType
from src.models.maintenance import MaintenanceLog


class MaintenanceMonitoringRepositoryPort(Protocol):
    """Repository contract required by ``MaintenanceMonitoringService``."""

    def get_all(self, skip: int = 0, limit: int = 100) -> list[MaintenanceLog]: ...


@dataclass(frozen=True)
class EquipmentHealthBand:
    """Corrective-ratio thresholds classifying one equipment's health.

    An equipment's health is DEGRADED whenever it has an ONGOING
    corrective maintenance log (an active failure being worked right
    now) regardless of ratio, or when its corrective/total ratio crosses
    ``degraded_corrective_ratio``; AT_RISK below that but above
    ``at_risk_corrective_ratio``; HEALTHY otherwise.
    """

    at_risk_corrective_ratio: float = 0.3
    degraded_corrective_ratio: float = 0.6

    def classify(self, corrective_ratio: float, has_ongoing_corrective: bool) -> str:
        if has_ongoing_corrective or corrective_ratio >= self.degraded_corrective_ratio:
            return "degraded"
        if corrective_ratio >= self.at_risk_corrective_ratio:
            return "at_risk"
        return "healthy"


class MaintenanceMonitoringService:
    """Builds an equipment-health summary from persisted maintenance logs."""

    def __init__(
        self,
        repository: MaintenanceMonitoringRepositoryPort,
        health_band: EquipmentHealthBand | None = None,
    ) -> None:
        self._repository = repository
        self._health_band = health_band or EquipmentHealthBand()

    def get_monitoring_summary(self) -> dict:
        """Return structured equipment-health summary keyed by ``equipment_id``.

        Returns:
            A dict with ``generated_at`` and ``equipment``, a list of rows
            each shaped like::

                {
                    "equipment_id": "EQ-TF-001",
                    "equipment_name": "Tank Farm Vapor Recovery Unit",
                    "total_logs": 4,
                    "corrective_logs": 2,
                    "corrective_ratio": 0.5,
                    "has_ongoing_corrective": True,
                    "health_status": "degraded",
                    "last_maintenance_at": datetime(...),
                }
        """
        logs = self._repository.get_all(skip=0, limit=10_000)

        by_equipment: dict[str, list[MaintenanceLog]] = {}
        for log in logs:
            by_equipment.setdefault(log.equipment_id, []).append(log)

        equipment_rows: list[dict] = []
        for equipment_id, equipment_logs in by_equipment.items():
            total = len(equipment_logs)
            corrective_logs = [
                log for log in equipment_logs if log.maintenance_type == MaintenanceType.CORRECTIVE
            ]
            corrective_ratio = len(corrective_logs) / total if total else 0.0
            has_ongoing_corrective = any(
                log.maintenance_type == MaintenanceType.CORRECTIVE
                and log.status == MaintenanceStatus.ONGOING
                for log in equipment_logs
            )
            last_maintenance_at = max(
                (log.start_time for log in equipment_logs if log.start_time is not None),
                default=None,
            )

            equipment_rows.append(
                {
                    "equipment_id": equipment_id,
                    "equipment_name": equipment_logs[0].equipment_name,
                    "total_logs": total,
                    "corrective_logs": len(corrective_logs),
                    "corrective_ratio": round(corrective_ratio, 3),
                    "has_ongoing_corrective": has_ongoing_corrective,
                    "health_status": self._health_band.classify(
                        corrective_ratio, has_ongoing_corrective
                    ),
                    "last_maintenance_at": last_maintenance_at,
                }
            )

        return {
            "generated_at": datetime.now(timezone.utc),
            "total_equipment": len(equipment_rows),
            "equipment": equipment_rows,
        }
