"""Compound Risk Detection service for SafeFusion AI.

Accepts monitoring outputs from Sensor Monitoring, Worker Monitoring, and
Permit Validation, runs them through the configurable ``CompoundRiskEngine``,
and returns a per-zone risk score, risk level, triggered rules, and a
human-readable explanation. Purely rule-based — no AI/ML involved. This
module has no SQL or HTTP concerns of its own; it depends only on the
minimal ``get_*_summary()`` ports of the three monitoring services.
"""

from __future__ import annotations

from typing import Protocol

from src.services.compound_risk.engine import CompoundRiskEngine
from src.services.compound_risk.schemas import ZoneCompoundRiskResult


class SensorMonitoringPort(Protocol):
    """Sensor monitoring contract required by ``CompoundRiskService``."""

    def get_monitoring_summary(self) -> dict: ...


class WorkerMonitoringPort(Protocol):
    """Worker monitoring contract required by ``CompoundRiskService``."""

    def get_monitoring_summary(self) -> dict: ...


class PermitValidationPort(Protocol):
    """Permit validation contract required by ``CompoundRiskService``."""

    def get_validation_summary(self) -> dict: ...


class CompoundRiskService:
    """Orchestrates compound risk detection across the three monitoring domains."""

    def __init__(
        self,
        engine: CompoundRiskEngine,
        sensor_monitoring: SensorMonitoringPort | None = None,
        worker_monitoring: WorkerMonitoringPort | None = None,
        permit_validation: PermitValidationPort | None = None,
    ) -> None:
        self._engine = engine
        self._sensor_monitoring = sensor_monitoring
        self._worker_monitoring = worker_monitoring
        self._permit_validation = permit_validation

    def detect_compound_risks(self) -> list[ZoneCompoundRiskResult]:
        """Pull the latest monitoring summaries and evaluate compound risk rules.

        Returns:
            One ``ZoneCompoundRiskResult`` per zone where at least one
            compound rule was triggered, sorted by risk score descending.
        """
        sensor_summary = (
            self._sensor_monitoring.get_monitoring_summary() if self._sensor_monitoring else None
        )
        worker_summary = (
            self._worker_monitoring.get_monitoring_summary() if self._worker_monitoring else None
        )
        permit_summary = (
            self._permit_validation.get_validation_summary() if self._permit_validation else None
        )

        return self._engine.evaluate(
            sensor_summary=sensor_summary,
            permit_summary=permit_summary,
            worker_summary=worker_summary,
        )

    def evaluate(
        self,
        sensor_summary: dict | None = None,
        worker_summary: dict | None = None,
        permit_summary: dict | None = None,
    ) -> list[ZoneCompoundRiskResult]:
        """Evaluate compound risk rules against explicitly supplied monitoring summaries.

        Use this instead of :meth:`detect_compound_risks` when the caller
        already has monitoring results on hand (e.g. from a combined
        monitoring response) and wants to avoid re-fetching them.
        """
        return self._engine.evaluate(
            sensor_summary=sensor_summary,
            permit_summary=permit_summary,
            worker_summary=worker_summary,
        )
