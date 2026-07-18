"""Data model for the SafeFusion AI Deterministic Demo Scenarios package.

A ``DemoScenario`` is a fully self-contained, hand-built fixture: fixed
sensor readings, a fixed permit, a fixed worker, and (optionally) a fixed
maintenance log and incident — all as plain dataclasses with literal
values, never generated. Nothing here calls ``datetime.now()``,
``random``, or touches a database. Running the same scenario any number
of times, in any process, produces byte-identical monitoring summaries and
therefore byte-identical recommendations (see
``src.services.demo_scenarios.runner.DemoScenarioRunner``).

Each fixture field matches the exact dict shape the real monitoring
services build (``SensorMonitoringService.get_monitoring_summary()``,
``PermitValidationService.build_validation_summary()``,
``WorkerMonitoringService.get_monitoring_summary()``,
``MaintenanceMonitoringService.get_monitoring_summary()``), so a scenario's
data can be fed straight into the same compound-risk / emergency-response
/ compliance / recommendation engines used in production, with no
adapter layer required.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from src.models.enums import (
    IncidentType,
    MaintenanceStatus,
    MaintenanceType,
    PermitStatus,
    PermitType,
    SensorStatus,
    SensorType,
    SeverityLevel,
    WorkerStatus,
)

#: Fixed point in time every scenario's timestamps are computed relative
#: to. Using a literal constant (not ``datetime.now()``) is what makes
#: permit validation state (VALID/EXPIRED/PENDING) reproducible — permit
#: validity depends on comparing ``start_time``/``end_time`` against "now",
#: so "now" itself must be fixed for the outcome to be deterministic.
DEMO_ANCHOR_TIME: datetime = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


@dataclass(frozen=True)
class DemoSensorReading:
    """One fixed sensor reading for a scenario's zone."""

    sensor_id: str
    sensor_type: SensorType
    value: float
    unit: str
    status: SensorStatus
    minutes_before_anchor: float = 5.0


@dataclass(frozen=True)
class DemoWorker:
    """One fixed worker present in a scenario's zone."""

    employee_id: str
    worker_id: str
    name: str
    department: str
    role: str
    shift: str
    status: WorkerStatus
    ppe_status: bool = True


@dataclass(frozen=True)
class DemoPermit:
    """One fixed permit covering (or not covering) a scenario's zone."""

    permit_id: str
    permit_type: PermitType
    issued_by: str
    assigned_team: str
    status: PermitStatus
    start_offset_hours: float
    end_offset_hours: float


@dataclass(frozen=True)
class DemoMaintenanceLog:
    """One fixed maintenance log for equipment in a scenario's zone."""

    log_id: str
    equipment_id: str
    equipment_name: str
    maintenance_type: MaintenanceType
    assigned_team: str
    status: MaintenanceStatus
    start_offset_hours: float


@dataclass(frozen=True)
class DemoIncident:
    """One fixed incident record for a scenario, feeding the compliance engine."""

    incident_id: str
    severity: SeverityLevel
    incident_type: IncidentType
    description: str
    root_cause: str
    minutes_before_anchor: float = 10.0


@dataclass(frozen=True)
class DemoScenario:
    """A fully deterministic, self-contained demo situation for one zone.

    Attributes:
        name: Stable machine-readable identifier (used as the CLI/route
            selector and the event bus ``correlation_id``).
        title: Human-readable name for display during a live demo.
        narrative: One or two sentences describing the situation, read
            aloud or shown on-screen while presenting the scenario.
        zone: The single plant zone this scenario concerns.
        sensors: Fixed sensor readings for ``zone``.
        workers: Fixed workers present in ``zone``.
        permits: Fixed permits covering (or not covering) ``zone``.
        maintenance_logs: Fixed maintenance history for equipment in
            ``zone``. Optional — many scenarios have no equipment angle.
        incidents: Fixed incident records feeding the compliance engine.
            Optional — several scenarios (e.g. Normal Plant) trigger no
            incident and therefore no compliance recommendations.
        equipment_zone_map: Equipment-id -> zone lookup for this
            scenario's maintenance logs, merged into the compound risk
            engine's configured map when the scenario runs (mirrors
            ``settings.EQUIPMENT_ZONE_MAP`` — see
            ``src.services.compound_risk.rules``).
    """

    name: str
    title: str
    narrative: str
    zone: str
    sensors: tuple[DemoSensorReading, ...] = field(default_factory=tuple)
    workers: tuple[DemoWorker, ...] = field(default_factory=tuple)
    permits: tuple[DemoPermit, ...] = field(default_factory=tuple)
    maintenance_logs: tuple[DemoMaintenanceLog, ...] = field(default_factory=tuple)
    incidents: tuple[DemoIncident, ...] = field(default_factory=tuple)
    equipment_zone_map: dict[str, str] = field(default_factory=dict)
