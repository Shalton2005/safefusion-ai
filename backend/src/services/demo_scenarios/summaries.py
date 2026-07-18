"""Builds monitoring-summary dicts from a ``DemoScenario``.

Reuses the real classification logic — ``PermitValidationService``
(permit validity) and ``ThresholdSensorClassifier``
(sensor status) — instead of re-deriving those rules here, so a scenario's
computed state (VALID/EXPIRED permit, WARNING/CRITICAL sensor) is
guaranteed to match what production would compute for the same fixed
inputs. The only thing this module supplies that production doesn't is a
*fixed* "now" (``DEMO_ANCHOR_TIME``), which is what makes the result
reproducible — permit validity is a function of wall-clock time in
production, so a demo run must pin it or two runs an hour apart would
classify the same permit differently.
"""

from __future__ import annotations

from datetime import timedelta

from src.config.settings import settings
from src.models.enums import MaintenanceType, PermitStatus, SensorType
from src.models.incident import Incident
from src.models.permit import Permit
from src.services.demo_scenarios.schemas import DEMO_ANCHOR_TIME, DemoScenario
from src.services.maintenance_monitoring import EquipmentHealthBand
from src.services.permit_validation import PermitValidationRules, PermitValidationService
from src.services.sensor_monitoring import SensorThresholdBand, ThresholdSensorClassifier


def _permit_validation_rules() -> PermitValidationRules:
    """Mirror ``src.routes.monitoring._permit_validation_rules`` exactly.

    Reads the same settings-backed thresholds production uses, so a
    scenario authored as "expired" or "valid" actually classifies that
    way under the real business rules, not a demo-only approximation.
    """
    return PermitValidationRules(
        valid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_VALID_STATUSES},
        pending_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_PENDING_STATUSES},
        invalid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_INVALID_STATUSES},
        expired_grace_seconds=settings.PERMIT_VALIDATION_EXPIRED_GRACE_SECONDS,
    )


def _sensor_thresholds() -> dict:
    """Mirror ``src.routes.monitoring._sensor_thresholds_from_settings`` exactly."""
    return {
        SensorType.GAS: SensorThresholdBand(
            warning_max=settings.SENSOR_GAS_WARNING_MAX,
            critical_max=settings.SENSOR_GAS_CRITICAL_MAX,
        ),
        SensorType.TEMPERATURE: SensorThresholdBand(
            warning_max=settings.SENSOR_TEMPERATURE_WARNING_MAX,
            critical_max=settings.SENSOR_TEMPERATURE_CRITICAL_MAX,
        ),
        SensorType.PRESSURE: SensorThresholdBand(
            warning_max=settings.SENSOR_PRESSURE_WARNING_MAX,
            critical_max=settings.SENSOR_PRESSURE_CRITICAL_MAX,
        ),
        SensorType.HUMIDITY: SensorThresholdBand(
            warning_max=settings.SENSOR_HUMIDITY_WARNING_MAX,
            critical_max=settings.SENSOR_HUMIDITY_CRITICAL_MAX,
        ),
        SensorType.SMOKE: SensorThresholdBand(
            warning_max=settings.SENSOR_SMOKE_WARNING_MAX,
            critical_max=settings.SENSOR_SMOKE_CRITICAL_MAX,
        ),
    }


def build_sensor_summary(scenario: DemoScenario) -> dict:
    """Return a sensor monitoring summary dict shaped like
    ``SensorMonitoringService.get_monitoring_summary()``, computed from
    the scenario's fixed readings and a fixed anchor time.
    """
    thresholds = _sensor_thresholds()
    classifier = ThresholdSensorClassifier()

    sensors: list[dict] = []
    counts = {"normal": 0, "warning": 0, "critical": 0, "total": 0}
    for reading in scenario.sensors:
        band = thresholds.get(reading.sensor_type, SensorThresholdBand())
        computed_status = classifier.classify(reading.value, band)
        counts[computed_status.value] += 1
        counts["total"] += 1
        sensors.append(
            {
                "id": reading.sensor_id,
                "zone": scenario.zone,
                "sensor_type": reading.sensor_type,
                "value": reading.value,
                "unit": reading.unit,
                "timestamp": DEMO_ANCHOR_TIME - timedelta(minutes=reading.minutes_before_anchor),
                "stored_status": reading.status,
                "computed_status": computed_status,
                "thresholds": {
                    "warning_min": band.warning_min,
                    "warning_max": band.warning_max,
                    "critical_min": band.critical_min,
                    "critical_max": band.critical_max,
                },
            }
        )

    return {
        "generated_at": DEMO_ANCHOR_TIME,
        "overall_status": (
            "critical" if counts["critical"] else "warning" if counts["warning"] else "normal"
        ),
        "total_sensors": len(sensors),
        "counts": counts,
        "sensors": sensors,
    }


def build_permit_summary(scenario: DemoScenario) -> dict:
    """Return a permit validation summary dict shaped like
    ``PermitValidationService.build_validation_summary()``, computed
    against the fixed ``DEMO_ANCHOR_TIME`` rather than wall-clock now.
    """
    service = PermitValidationService(rules=_permit_validation_rules())
    permits = [
        Permit(
            id=permit.permit_id,
            permit_type=permit.permit_type,
            zone=scenario.zone,
            issued_by=permit.issued_by,
            assigned_team=permit.assigned_team,
            start_time=DEMO_ANCHOR_TIME + timedelta(hours=permit.start_offset_hours),
            end_time=DEMO_ANCHOR_TIME + timedelta(hours=permit.end_offset_hours),
            status=permit.status,
        )
        for permit in scenario.permits
    ]
    return service.build_validation_summary(permits, now=DEMO_ANCHOR_TIME)


def build_worker_summary(scenario: DemoScenario) -> dict:
    """Return a worker monitoring summary dict shaped like
    ``WorkerMonitoringService.get_monitoring_summary()``, computed
    directly from the scenario's fixed worker list (no active-permit
    cross-reference — compound risk rules read ``assigned_zone`` only).
    """
    counts = {"working": 0, "idle": 0, "emergency": 0, "total": 0}
    workers: list[dict] = []
    for worker in scenario.workers:
        counts[worker.status.value] += 1
        counts["total"] += 1
        workers.append(
            {
                "worker_id": worker.worker_id,
                "employee_id": worker.employee_id,
                "name": worker.name,
                "assigned_zone": scenario.zone,
                "simulated_location": f"{scenario.zone}-checkpoint",
                "active_permit_id": None,
                "active_permit_type": None,
                "shift": worker.shift,
                "ppe_status_placeholder": worker.ppe_status,
                "current_status": worker.status,
            }
        )

    return {
        "generated_at": DEMO_ANCHOR_TIME,
        "total_workers": len(workers),
        "workers_with_active_permit": 0,
        "counts": counts,
        "workers": workers,
    }


def build_maintenance_summary(scenario: DemoScenario) -> dict:
    """Return a maintenance monitoring summary dict shaped like
    ``MaintenanceMonitoringService.get_monitoring_summary()``, computed
    from the scenario's fixed maintenance logs.
    """
    health_band = EquipmentHealthBand(
        at_risk_corrective_ratio=settings.EQUIPMENT_HEALTH_AT_RISK_CORRECTIVE_RATIO,
        degraded_corrective_ratio=settings.EQUIPMENT_HEALTH_DEGRADED_CORRECTIVE_RATIO,
    )

    by_equipment: dict[str, list] = {}
    for log in scenario.maintenance_logs:
        by_equipment.setdefault(log.equipment_id, []).append(log)

    equipment_rows: list[dict] = []
    for equipment_id, logs in by_equipment.items():
        total = len(logs)
        corrective_logs = [log for log in logs if log.maintenance_type == MaintenanceType.CORRECTIVE]
        corrective_ratio = len(corrective_logs) / total if total else 0.0
        has_ongoing_corrective = any(
            log.maintenance_type == MaintenanceType.CORRECTIVE and log.status.value == "ongoing"
            for log in logs
        )
        last_maintenance_at = max(
            (DEMO_ANCHOR_TIME - timedelta(hours=log.start_offset_hours) for log in logs),
            default=None,
        )
        equipment_rows.append(
            {
                "equipment_id": equipment_id,
                "equipment_name": logs[0].equipment_name,
                "total_logs": total,
                "corrective_logs": len(corrective_logs),
                "corrective_ratio": round(corrective_ratio, 3),
                "has_ongoing_corrective": has_ongoing_corrective,
                "health_status": health_band.classify(corrective_ratio, has_ongoing_corrective),
                "last_maintenance_at": last_maintenance_at,
            }
        )

    return {
        "generated_at": DEMO_ANCHOR_TIME,
        "total_equipment": len(equipment_rows),
        "equipment": equipment_rows,
    }


def build_incidents(scenario: DemoScenario) -> list:
    """Return in-memory ``Incident`` ORM instances for the scenario's fixed incidents.

    Never persisted — ``ComplianceService.evaluate_incident()`` and
    ``ComplianceRuleEngine.evaluate()`` only read attributes off the
    object, so an unsaved instance is sufficient and keeps this module
    free of any DB dependency.
    """
    return [
        Incident(
            id=incident.incident_id,
            zone=scenario.zone,
            severity=incident.severity,
            incident_type=incident.incident_type,
            description=incident.description,
            root_cause=incident.root_cause,
            occurred_at=DEMO_ANCHOR_TIME - timedelta(minutes=incident.minutes_before_anchor),
        )
        for incident in scenario.incidents
    ]
