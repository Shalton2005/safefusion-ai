"""Recommendation Engine: aggregates per-source recommendations into one ordered list."""

from __future__ import annotations

from dataclasses import dataclass

from src.services.compliance.schemas import IncidentComplianceResult
from src.services.compound_risk.schemas import ZoneCompoundRiskResult
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult
from src.services.recommendation.generators import (
    ComplianceRecommendationGenerator,
    CompoundRiskRecommendationGenerator,
    EmergencyResponseRecommendationGenerator,
)
from src.services.recommendation.schemas import Recommendation


@dataclass
class RecommendationEngine:
    """Combines Compound Risk, Emergency Response, and Compliance output into one ordered list.

    Purely rule-based: each generator maps its engine's output to
    recommendations using centrally configured priority weights and
    message templates (``src.config.recommendation_rules``); this class
    only aggregates and sorts. No AI/ML involved.
    """

    compound_risk_generator: CompoundRiskRecommendationGenerator
    emergency_response_generator: EmergencyResponseRecommendationGenerator
    compliance_generator: ComplianceRecommendationGenerator

    def generate(
        self,
        compound_risk_results: list[ZoneCompoundRiskResult] | None = None,
        emergency_response_results: list[ZoneEmergencyResponseResult] | None = None,
        compliance_results: list[IncidentComplianceResult] | None = None,
    ) -> list[Recommendation]:
        """Aggregate recommendations from every supplied source, ordered by priority.

        Any source may be omitted (``None``) if its engine wasn't run;
        omitted sources simply contribute no recommendations.

        Returns:
            All recommendations sorted by ``priority`` ascending (lower
            priority value = higher urgency = sorts first). Ties preserve
            the source order: Emergency Response, then Compound Risk,
            then Compliance, in the order each source's items were
            generated (stable sort).
        """
        recommendations: list[Recommendation] = []
        if emergency_response_results:
            recommendations.extend(self.emergency_response_generator.generate(emergency_response_results))
        if compound_risk_results:
            recommendations.extend(self.compound_risk_generator.generate(compound_risk_results))
        if compliance_results:
            recommendations.extend(self.compliance_generator.generate(compliance_results))

        recommendations.sort(key=lambda recommendation: recommendation.priority)
        return recommendations
