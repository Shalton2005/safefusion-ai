"""Recommendation service layer for SafeFusion AI.

Generates ordered operator recommendations by combining the outputs of
the Compound Risk Engine, Emergency Response Engine, and Compliance Rule
Engine. Purely rule-based — no AI/ML involved. This module has no SQL or
HTTP concerns of its own; it depends only on the minimal ports of the
three upstream services.
"""

from __future__ import annotations

from typing import Protocol

from src.services.compliance.schemas import IncidentComplianceResult
from src.services.compound_risk.schemas import ZoneCompoundRiskResult
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult
from src.services.recommendation.engine import RecommendationEngine
from src.services.recommendation.schemas import Recommendation


class CompoundRiskPort(Protocol):
    """Compound Risk contract required by ``RecommendationService``."""

    def detect_compound_risks(self) -> list[ZoneCompoundRiskResult]: ...


class EmergencyResponsePort(Protocol):
    """Emergency Response contract required by ``RecommendationService``."""

    def respond(self, zone_results: list[ZoneCompoundRiskResult]) -> list[ZoneEmergencyResponseResult]: ...


class CompliancePort(Protocol):
    """Compliance contract required by ``RecommendationService``."""

    def evaluate_all_incidents(self, skip: int = 0, limit: int = 100) -> list[IncidentComplianceResult]: ...


class RecommendationService:
    """Orchestrates recommendation generation across all three safety engines."""

    def __init__(
        self,
        engine: RecommendationEngine,
        compound_risk: CompoundRiskPort | None = None,
        emergency_response: EmergencyResponsePort | None = None,
        compliance: CompliancePort | None = None,
    ) -> None:
        self._engine = engine
        self._compound_risk = compound_risk
        self._emergency_response = emergency_response
        self._compliance = compliance

    def generate_recommendations(self) -> list[Recommendation]:
        """Run all three configured engines and return one ordered recommendation list.

        Each upstream source is optional — if its port wasn't supplied,
        it simply contributes no recommendations. Emergency Response is
        evaluated against the same Compound Risk output used for the
        Compound Risk recommendations, so both reflect one consistent
        snapshot.
        """
        compound_risk_results = self._compound_risk.detect_compound_risks() if self._compound_risk else []

        emergency_response_results: list[ZoneEmergencyResponseResult] = []
        if self._emergency_response is not None:
            emergency_response_results = self._emergency_response.respond(compound_risk_results)

        # Match the 500-row ceiling exposed by GET /compliance/status and
        # POST /compliance/evaluate — the repository-level default of 100
        # would otherwise silently truncate compliance-derived
        # recommendations with no way for the caller to detect or raise it.
        compliance_results = self._compliance.evaluate_all_incidents(limit=500) if self._compliance else []

        return self.evaluate(
            compound_risk_results=compound_risk_results,
            emergency_response_results=emergency_response_results,
            compliance_results=compliance_results,
        )

    def evaluate(
        self,
        compound_risk_results: list[ZoneCompoundRiskResult] | None = None,
        emergency_response_results: list[ZoneEmergencyResponseResult] | None = None,
        compliance_results: list[IncidentComplianceResult] | None = None,
    ) -> list[Recommendation]:
        """Generate ordered recommendations from explicitly supplied engine outputs.

        Use this instead of :meth:`generate_recommendations` when the
        caller already has results on hand (e.g. from a prior combined
        run) and wants to avoid re-evaluating the upstream engines.
        """
        return self._engine.generate(
            compound_risk_results=compound_risk_results,
            emergency_response_results=emergency_response_results,
            compliance_results=compliance_results,
        )
