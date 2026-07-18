"""Tests for building monitoring-summary dicts from a DemoScenario."""

from __future__ import annotations

from src.models.enums import (
    MaintenanceStatus,
    MaintenanceType,
    PermitStatus,
    PermitType,
    SensorStatus,
    SensorType,
    SeverityLevel,
    IncidentType,
    WorkerStatus,
)
from src.services.demo_scenarios.schemas import (
    DEMO_ANCHOR_TIME,
    DemoIncident,
    DemoMaintenanceLog,
    DemoPermit,
    DemoScenario,
    DemoSensorReading,
    DemoWorker,
)
from src.services.demo_scenarios.summaries import (
    build_incidents,
    build_maintenance_summary,
    build_permit_summary,
    build_sensor_summary,
    build_worker_summary,
)


class TestBuildSensorSummary:
    def test_classifies_critical_reading(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-A",
            sensors=(DemoSensorReading("SEN-1", SensorType.GAS, 95.0, "ppm", SensorStatus.CRITICAL),),
        )
        summary = build_sensor_summary(scenario)
        assert summary["counts"]["critical"] == 1
        assert summary["overall_status"] == "critical"
        assert summary["sensors"][0]["computed_status"].value == "critical"

    def test_generated_at_uses_fixed_anchor(self) -> None:
        scenario = DemoScenario(name="s", title="S", narrative="n", zone="Zone-A")
        summary = build_sensor_summary(scenario)
        assert summary["generated_at"] == DEMO_ANCHOR_TIME

    def test_empty_sensors_produce_normal_overall_status(self) -> None:
        scenario = DemoScenario(name="s", title="S", narrative="n", zone="Zone-A")
        summary = build_sensor_summary(scenario)
        assert summary["overall_status"] == "normal"
        assert summary["total_sensors"] == 0


class TestBuildPermitSummary:
    def test_active_future_dated_permit_is_valid(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-A",
            permits=(
                DemoPermit(
                    "PTW-1", PermitType.HOT_WORK, "Officer", "Team",
                    PermitStatus.ACTIVE, start_offset_hours=-1.0, end_offset_hours=5.0,
                ),
            ),
        )
        summary = build_permit_summary(scenario)
        assert summary["counts"]["valid"] == 1
        assert summary["permits"][0]["validation_state"].value == "valid"

    def test_past_end_time_is_expired(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-A",
            permits=(
                DemoPermit(
                    "PTW-1", PermitType.HOT_WORK, "Officer", "Team",
                    PermitStatus.ACTIVE, start_offset_hours=-10.0, end_offset_hours=-2.0,
                ),
            ),
        )
        summary = build_permit_summary(scenario)
        assert summary["counts"]["expired"] == 1

    def test_suspended_status_is_invalid(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-A",
            permits=(
                DemoPermit(
                    "PTW-1", PermitType.HOT_WORK, "Officer", "Team",
                    PermitStatus.SUSPENDED, start_offset_hours=-4.0, end_offset_hours=2.0,
                ),
            ),
        )
        summary = build_permit_summary(scenario)
        assert summary["counts"]["invalid"] == 1

    def test_zone_matches_scenario_zone(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-Q",
            permits=(
                DemoPermit(
                    "PTW-1", PermitType.HOT_WORK, "Officer", "Team",
                    PermitStatus.ACTIVE, start_offset_hours=-1.0, end_offset_hours=5.0,
                ),
            ),
        )
        summary = build_permit_summary(scenario)
        assert summary["permits"][0]["zone"] == "Zone-Q"


class TestBuildWorkerSummary:
    def test_worker_assigned_to_scenario_zone(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-A",
            workers=(
                DemoWorker("EMP-1", "WRK-1", "Name", "Dept", "Role", "Morning", WorkerStatus.WORKING),
            ),
        )
        summary = build_worker_summary(scenario)
        assert summary["workers"][0]["assigned_zone"] == "Zone-A"
        assert summary["counts"]["working"] == 1

    def test_emergency_status_counted(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-A",
            workers=(
                DemoWorker("EMP-1", "WRK-1", "Name", "Dept", "Role", "Night", WorkerStatus.EMERGENCY),
            ),
        )
        summary = build_worker_summary(scenario)
        assert summary["counts"]["emergency"] == 1


class TestBuildMaintenanceSummary:
    def test_ongoing_corrective_log_is_degraded(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-A",
            maintenance_logs=(
                DemoMaintenanceLog(
                    "MNT-1", "EQ-1", "Pump", MaintenanceType.CORRECTIVE,
                    "Team", MaintenanceStatus.ONGOING, start_offset_hours=1.0,
                ),
            ),
        )
        summary = build_maintenance_summary(scenario)
        assert summary["equipment"][0]["health_status"] == "degraded"

    def test_preventive_only_is_healthy(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-A",
            maintenance_logs=(
                DemoMaintenanceLog(
                    "MNT-1", "EQ-1", "Pump", MaintenanceType.PREVENTIVE,
                    "Team", MaintenanceStatus.COMPLETED, start_offset_hours=100.0,
                ),
            ),
        )
        summary = build_maintenance_summary(scenario)
        assert summary["equipment"][0]["health_status"] == "healthy"

    def test_no_logs_produces_empty_summary(self) -> None:
        scenario = DemoScenario(name="s", title="S", narrative="n", zone="Zone-A")
        summary = build_maintenance_summary(scenario)
        assert summary["total_equipment"] == 0


class TestBuildIncidents:
    def test_builds_one_incident_instance_per_fixture(self) -> None:
        scenario = DemoScenario(
            name="s", title="S", narrative="n", zone="Zone-A",
            incidents=(
                DemoIncident(
                    "INC-1", SeverityLevel.CRITICAL, IncidentType.GAS_LEAK,
                    "desc", "cause",
                ),
            ),
        )
        incidents = build_incidents(scenario)
        assert len(incidents) == 1
        assert incidents[0].zone == "Zone-A"
        assert incidents[0].severity == SeverityLevel.CRITICAL

    def test_no_incidents_returns_empty_list(self) -> None:
        scenario = DemoScenario(name="s", title="S", narrative="n", zone="Zone-A")
        assert build_incidents(scenario) == []
