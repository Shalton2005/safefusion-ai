"""Modular alert rule engine for SafeFusion AI.

Each rule inspects a monitoring summary (produced by
``SensorMonitoringService``, ``PermitValidationService``, or
``WorkerMonitoringService``) and yields zero or more ``AlertCandidate``
records. Rules are independent and composable — new rules can be added
without modifying existing ones or the service that runs them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from src.models.enums import AlertSeverity, AlertSource, AlertStatus, AlertType


@dataclass(frozen=True)
class AlertCandidate:
    """A prospective alert produced by a rule, prior to persistence."""

    zone: str
    alert_type: AlertType
    severity: AlertSeverity
    source: AlertSource
    message: str
    generated_by: str = "Alert Generation Engine"
    status: AlertStatus = AlertStatus.ACTIVE

    def as_dict(self) -> dict:
        return {
            "zone": self.zone,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "source": self.source,
            "message": self.message,
            "generated_by": self.generated_by,
            "status": self.status,
        }


class AlertRule(Protocol):
    """Contract implemented by every alert generation rule."""

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
    ) -> list[AlertCandidate]: ...


class CriticalSensorRule:
    """Critical sensor reading -> Critical alert."""

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
    ) -> list[AlertCandidate]:
        if not sensor_summary:
            return []

        candidates: list[AlertCandidate] = []
        for sensor in sensor_summary.get("sensors", []):
            if sensor["computed_status"] != "critical":
                continue
            candidates.append(
                AlertCandidate(
                    zone=sensor["zone"],
                    alert_type=AlertType.CRITICAL,
                    severity=AlertSeverity.CRITICAL,
                    source=AlertSource.SENSOR_MONITORING,
                    message=(
                        f"Critical {sensor['sensor_type']} reading of "
                        f"{sensor['value']}{sensor['unit']} detected in zone {sensor['zone']}."
                    ),
                )
            )
        return candidates


class ExpiredPermitRule:
    """Expired permit -> High alert."""

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
    ) -> list[AlertCandidate]:
        if not permit_summary:
            return []

        candidates: list[AlertCandidate] = []
        for permit in permit_summary.get("permits", []):
            if permit["validation_state"] != "expired":
                continue
            permit_type = permit["permit_type"]
            permit_type_label = getattr(permit_type, "value", permit_type)
            candidates.append(
                AlertCandidate(
                    zone=permit["zone"],
                    alert_type=AlertType.WARNING,
                    severity=AlertSeverity.HIGH,
                    source=AlertSource.PERMIT_VALIDATION,
                    message=(
                        f"Permit {permit['permit_id']} ({permit_type_label}) in zone "
                        f"{permit['zone']} has expired."
                    ),
                )
            )
        return candidates


class RestrictedZoneRule:
    """Worker present in a restricted zone -> Medium alert."""

    def __init__(self, restricted_zones: set[str]) -> None:
        self._restricted_zones = restricted_zones

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
    ) -> list[AlertCandidate]:
        if not worker_summary or not self._restricted_zones:
            return []

        candidates: list[AlertCandidate] = []
        for worker in worker_summary.get("workers", []):
            zone = worker.get("assigned_zone")
            if zone not in self._restricted_zones:
                continue
            candidates.append(
                AlertCandidate(
                    zone=zone,
                    alert_type=AlertType.WARNING,
                    severity=AlertSeverity.MEDIUM,
                    source=AlertSource.WORKER_MONITORING,
                    message=(
                        f"Worker {worker['employee_id']} ({worker['name']}) detected in "
                        f"restricted zone {zone}."
                    ),
                )
            )
        return candidates


@dataclass
class AlertRuleEngine:
    """Runs a configurable, ordered set of alert rules over monitoring outputs."""

    rules: list[AlertRule] = field(default_factory=list)

    def generate(
        self,
        sensor_summary: dict | None = None,
        permit_summary: dict | None = None,
        worker_summary: dict | None = None,
    ) -> list[AlertCandidate]:
        """Evaluate all configured rules and return the combined alert candidates."""
        candidates: list[AlertCandidate] = []
        for rule in self.rules:
            candidates.extend(rule.evaluate(sensor_summary, permit_summary, worker_summary))
        return candidates
