"""Risk score calculation service for SafeFusion AI.

Consumes monitoring service outputs (sensor, permit, worker), runs them
through the modular ``RiskScoreEngine``, and persists the resulting
per-zone ``RiskScore`` records. This module has no SQL or HTTP concerns
of its own — persistence goes through an injected repository port.
"""

from __future__ import annotations

from typing import Protocol

from src.models.risk_score import RiskScore
from src.services.risk_scoring import RiskScoreEngine, ZoneRiskResult


class RiskScoreRepositoryPort(Protocol):
    """Repository contract required by ``RiskScoreCalculationService``."""

    def create(self, data: dict) -> RiskScore: ...


class SensorMonitoringPort(Protocol):
    """Sensor monitoring contract required by ``RiskScoreCalculationService``."""

    def get_monitoring_summary(self) -> dict: ...


class PermitValidationPort(Protocol):
    """Permit validation contract required by ``RiskScoreCalculationService``."""

    def get_validation_summary(self) -> dict: ...


class WorkerMonitoringPort(Protocol):
    """Worker monitoring contract required by ``RiskScoreCalculationService``."""

    def get_monitoring_summary(self) -> dict: ...


class RiskScoreCalculationService:
    """Orchestrates risk score calculation from monitoring outputs via the risk engine."""

    def __init__(
        self,
        repository: RiskScoreRepositoryPort,
        risk_engine: RiskScoreEngine,
        sensor_monitoring: SensorMonitoringPort | None = None,
        permit_validation: PermitValidationPort | None = None,
        worker_monitoring: WorkerMonitoringPort | None = None,
    ) -> None:
        self._repository = repository
        self._risk_engine = risk_engine
        self._sensor_monitoring = sensor_monitoring
        self._permit_validation = permit_validation
        self._worker_monitoring = worker_monitoring

    def calculate_risk_scores(self) -> list[ZoneRiskResult]:
        """Pull latest monitoring outputs and return per-zone risk results (no persistence)."""
        sensor_summary = (
            self._sensor_monitoring.get_monitoring_summary() if self._sensor_monitoring else None
        )
        permit_summary = (
            self._permit_validation.get_validation_summary() if self._permit_validation else None
        )
        worker_summary = (
            self._worker_monitoring.get_monitoring_summary() if self._worker_monitoring else None
        )

        return self.calculate_from_summaries(
            sensor_summary=sensor_summary,
            permit_summary=permit_summary,
            worker_summary=worker_summary,
        )

    def calculate_from_summaries(
        self,
        sensor_summary: dict | None = None,
        permit_summary: dict | None = None,
        worker_summary: dict | None = None,
    ) -> list[ZoneRiskResult]:
        """Evaluate the risk engine against explicitly supplied monitoring summaries.

        Use this instead of :meth:`calculate_risk_scores` when the caller
        already has monitoring results on hand (e.g. from a combined
        monitoring response) and wants to avoid re-fetching them.
        """
        return self._risk_engine.calculate(
            sensor_summary=sensor_summary,
            permit_summary=permit_summary,
            worker_summary=worker_summary,
        )

    def persist_risk_scores(self, results: list[ZoneRiskResult]) -> list[RiskScore]:
        """Persist the given calculated results, each as a new ``RiskScore`` record."""
        return [self._repository.create(self._to_payload(result)) for result in results]

    def calculate_and_persist_risk_scores(self) -> list[RiskScore]:
        """Calculate per-zone risk scores and persist each as a new ``RiskScore`` record."""
        return self.persist_risk_scores(self.calculate_risk_scores())

    @staticmethod
    def _to_payload(result: ZoneRiskResult) -> dict:
        return {
            "zone": result.zone,
            "risk_score": result.score,
            "risk_level": result.risk_level,
            "contributing_factors": result.contributing_factors_text(),
        }
