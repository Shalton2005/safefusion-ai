"""Alert generation service for SafeFusion AI.

Consumes monitoring service outputs (sensor, permit, worker) and runs
them through a modular ``AlertRuleEngine`` to produce and persist
``Alert`` records. This module has no SQL or HTTP concerns of its own —
persistence goes through an injected repository port.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Protocol

from src.config.settings import settings
from src.models.alert import Alert
from src.models.enums import AlertType
from src.services.alert_rules import AlertRuleEngine


class AlertGenerationRepositoryPort(Protocol):
    """Repository contract required by ``AlertGenerationService``."""

    def create(self, data: dict) -> Alert: ...

    def exists_since(self, zone: str, alert_type: AlertType, since: datetime) -> bool: ...


class SensorMonitoringPort(Protocol):
    """Sensor monitoring contract required by ``AlertGenerationService``."""

    def get_monitoring_summary(self) -> dict: ...


class PermitValidationPort(Protocol):
    """Permit validation contract required by ``AlertGenerationService``."""

    def get_validation_summary(self) -> dict: ...


class WorkerMonitoringPort(Protocol):
    """Worker monitoring contract required by ``AlertGenerationService``."""

    def get_monitoring_summary(self) -> dict: ...


class AlertGenerationService:
    """Orchestrates alert generation from monitoring outputs via the rule engine."""

    def __init__(
        self,
        repository: AlertGenerationRepositoryPort,
        rule_engine: AlertRuleEngine,
        sensor_monitoring: SensorMonitoringPort | None = None,
        permit_validation: PermitValidationPort | None = None,
        worker_monitoring: WorkerMonitoringPort | None = None,
    ) -> None:
        self._repository = repository
        self._rule_engine = rule_engine
        self._sensor_monitoring = sensor_monitoring
        self._permit_validation = permit_validation
        self._worker_monitoring = worker_monitoring

    def generate_and_persist_alerts(self) -> list[Alert]:
        """Pull latest monitoring outputs, evaluate rules, and persist resulting alerts.

        Suppresses a candidate whose (zone, alert_type) pair already has a
        recent alert within ``ALERT_GENERATION_COOLDOWN_SECONDS`` — without
        this, a zone whose condition stays matched across many consecutive
        evaluations (every ~1s scenario tick, or every poll of the real
        monitoring routes) gets a brand-new Alert row every single time,
        the same unbounded-growth bug fixed for auto-generated Incidents in
        ``EmergencyResponseService._generate_incident``.
        """
        sensor_summary = (
            self._sensor_monitoring.get_monitoring_summary() if self._sensor_monitoring else None
        )
        permit_summary = (
            self._permit_validation.get_validation_summary() if self._permit_validation else None
        )
        worker_summary = (
            self._worker_monitoring.get_monitoring_summary() if self._worker_monitoring else None
        )

        candidates = self._rule_engine.generate(
            sensor_summary=sensor_summary,
            permit_summary=permit_summary,
            worker_summary=worker_summary,
        )

        cooldown_start = datetime.now(UTC) - timedelta(seconds=settings.ALERT_GENERATION_COOLDOWN_SECONDS)
        created: list[Alert] = []
        for candidate in candidates:
            if self._repository.exists_since(
                zone=candidate.zone, alert_type=candidate.alert_type, since=cooldown_start
            ):
                continue
            created.append(self._repository.create(candidate.as_dict()))
        return created
