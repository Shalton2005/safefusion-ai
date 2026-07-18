"""Tests for the Maintenance Monitoring (equipment health) service."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from src.models.enums import MaintenanceStatus, MaintenanceType
from src.models.maintenance import MaintenanceLog
from src.services.maintenance_monitoring import EquipmentHealthBand, MaintenanceMonitoringService

NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _log(
    equipment_id: str,
    equipment_name: str = "Test Equipment",
    maintenance_type: MaintenanceType = MaintenanceType.PREVENTIVE,
    status: MaintenanceStatus = MaintenanceStatus.COMPLETED,
    start_time: datetime | None = None,
) -> MaintenanceLog:
    return MaintenanceLog(
        id=uuid.uuid4(),
        equipment_id=equipment_id,
        equipment_name=equipment_name,
        maintenance_type=maintenance_type,
        assigned_team="Test Team",
        status=status,
        start_time=start_time or NOW,
    )


class _StubRepository:
    def __init__(self, logs: list[MaintenanceLog]) -> None:
        self._logs = logs

    def get_all(self, skip: int = 0, limit: int = 100) -> list[MaintenanceLog]:
        return self._logs


class TestEquipmentHealthBand:
    def test_ongoing_corrective_forces_degraded_regardless_of_ratio(self) -> None:
        band = EquipmentHealthBand()
        assert band.classify(corrective_ratio=0.0, has_ongoing_corrective=True) == "degraded"

    def test_high_corrective_ratio_is_degraded(self) -> None:
        band = EquipmentHealthBand(degraded_corrective_ratio=0.6)
        assert band.classify(corrective_ratio=0.7, has_ongoing_corrective=False) == "degraded"

    def test_moderate_corrective_ratio_is_at_risk(self) -> None:
        band = EquipmentHealthBand(at_risk_corrective_ratio=0.3, degraded_corrective_ratio=0.6)
        assert band.classify(corrective_ratio=0.4, has_ongoing_corrective=False) == "at_risk"

    def test_low_corrective_ratio_is_healthy(self) -> None:
        band = EquipmentHealthBand(at_risk_corrective_ratio=0.3)
        assert band.classify(corrective_ratio=0.1, has_ongoing_corrective=False) == "healthy"


class TestMaintenanceMonitoringService:
    def test_groups_logs_by_equipment_id(self) -> None:
        logs = [_log("EQ-001"), _log("EQ-001"), _log("EQ-002")]
        service = MaintenanceMonitoringService(repository=_StubRepository(logs))
        summary = service.get_monitoring_summary()

        assert summary["total_equipment"] == 2
        by_id = {row["equipment_id"]: row for row in summary["equipment"]}
        assert by_id["EQ-001"]["total_logs"] == 2
        assert by_id["EQ-002"]["total_logs"] == 1

    def test_ongoing_corrective_log_marks_equipment_degraded(self) -> None:
        logs = [_log("EQ-001", maintenance_type=MaintenanceType.CORRECTIVE, status=MaintenanceStatus.ONGOING)]
        service = MaintenanceMonitoringService(repository=_StubRepository(logs))
        summary = service.get_monitoring_summary()

        row = summary["equipment"][0]
        assert row["has_ongoing_corrective"] is True
        assert row["health_status"] == "degraded"

    def test_all_preventive_logs_are_healthy(self) -> None:
        logs = [_log("EQ-001"), _log("EQ-001"), _log("EQ-001")]
        service = MaintenanceMonitoringService(repository=_StubRepository(logs))
        summary = service.get_monitoring_summary()

        row = summary["equipment"][0]
        assert row["corrective_ratio"] == 0.0
        assert row["health_status"] == "healthy"

    def test_high_corrective_ratio_without_ongoing_is_degraded(self) -> None:
        logs = [
            _log("EQ-001", maintenance_type=MaintenanceType.CORRECTIVE, status=MaintenanceStatus.COMPLETED),
            _log("EQ-001", maintenance_type=MaintenanceType.CORRECTIVE, status=MaintenanceStatus.COMPLETED),
            _log("EQ-001", maintenance_type=MaintenanceType.PREVENTIVE, status=MaintenanceStatus.COMPLETED),
        ]
        service = MaintenanceMonitoringService(
            repository=_StubRepository(logs),
            health_band=EquipmentHealthBand(degraded_corrective_ratio=0.6),
        )
        summary = service.get_monitoring_summary()

        row = summary["equipment"][0]
        assert row["corrective_ratio"] == pytest.approx(2 / 3, abs=0.001)
        assert row["health_status"] == "degraded"

    def test_last_maintenance_at_picks_latest_start_time(self) -> None:
        older = _log("EQ-001", start_time=NOW - timedelta(days=10))
        newer = _log("EQ-001", start_time=NOW - timedelta(days=1))
        service = MaintenanceMonitoringService(repository=_StubRepository([older, newer]))
        summary = service.get_monitoring_summary()

        assert summary["equipment"][0]["last_maintenance_at"] == newer.start_time

    def test_empty_logs_produce_empty_summary(self) -> None:
        service = MaintenanceMonitoringService(repository=_StubRepository([]))
        summary = service.get_monitoring_summary()

        assert summary["total_equipment"] == 0
        assert summary["equipment"] == []
