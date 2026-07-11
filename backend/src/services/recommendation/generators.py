"""Configurable recommendation generators for SafeFusion AI.

Each generator turns one engine's output (Compound Risk, Emergency
Response, Compliance) into a list of ``Recommendation`` objects using the
centrally configured priority weights and message templates in
``src.config.recommendation_rules``. Purely rule-based string templating
— no AI/ML involved. New sources can be added by implementing the same
``Protocol`` without touching the engine or other generators.
"""

from __future__ import annotations

from typing import Protocol

from src.config.recommendation_rules import (
    COMPLIANCE_FRAMEWORK_SEVERITY_OFFSET,
    COMPLIANCE_MESSAGE_TEMPLATE,
    COMPOUND_RISK_MESSAGE_TEMPLATES,
    EMERGENCY_ACTION_MESSAGE_TEMPLATES,
    EMERGENCY_ACTION_SEVERITY_OFFSET,
    RISK_LEVEL_SEVERITY_OFFSET,
    SOURCE_PRIORITY,
)
from src.models.enums import RecommendationSource
from src.services.compliance.schemas import IncidentComplianceResult
from src.services.compound_risk.schemas import ZoneCompoundRiskResult
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult
from src.services.recommendation.schemas import Recommendation


class RecommendationGenerator(Protocol):
    """Contract implemented by every per-source recommendation generator."""

    def generate(self, results: list) -> list[Recommendation]: ...


class CompoundRiskRecommendationGenerator:
    """Generates one recommendation per zone from Compound Risk Engine output."""

    def generate(self, results: list[ZoneCompoundRiskResult]) -> list[Recommendation]:
        source_priority = SOURCE_PRIORITY[RecommendationSource.COMPOUND_RISK]
        recommendations: list[Recommendation] = []
        for result in results:
            template = COMPOUND_RISK_MESSAGE_TEMPLATES.get(result.risk_level)
            if template is None:
                continue
            offset = RISK_LEVEL_SEVERITY_OFFSET[result.risk_level]
            recommendations.append(
                Recommendation(
                    source=RecommendationSource.COMPOUND_RISK,
                    zone=result.zone,
                    priority=source_priority + offset,
                    message=template.format(zone=result.zone, risk_score=result.risk_score),
                    reason=f"compound_risk:{result.risk_level.value}",
                )
            )
        return recommendations


class EmergencyResponseRecommendationGenerator:
    """Generates one recommendation per dispatched action from Emergency Response output."""

    def generate(self, results: list[ZoneEmergencyResponseResult]) -> list[Recommendation]:
        source_priority = SOURCE_PRIORITY[RecommendationSource.EMERGENCY_RESPONSE]
        recommendations: list[Recommendation] = []
        for result in results:
            for match in result.actions:
                template = EMERGENCY_ACTION_MESSAGE_TEMPLATES.get(match.action)
                if template is None:
                    continue
                offset = EMERGENCY_ACTION_SEVERITY_OFFSET.get(match.action, 9)
                recommendations.append(
                    Recommendation(
                        source=RecommendationSource.EMERGENCY_RESPONSE,
                        zone=result.zone,
                        priority=source_priority + offset,
                        message=template.format(zone=result.zone),
                        reason=f"emergency_action:{match.action.value}",
                    )
                )
        return recommendations


class ComplianceRecommendationGenerator:
    """Generates one recommendation per violated rule from Compliance Engine output."""

    def generate(self, results: list[IncidentComplianceResult]) -> list[Recommendation]:
        source_priority = SOURCE_PRIORITY[RecommendationSource.COMPLIANCE]
        recommendations: list[Recommendation] = []
        for result in results:
            for violation in result.violations:
                offset = COMPLIANCE_FRAMEWORK_SEVERITY_OFFSET.get(violation.framework, 9)
                recommendations.append(
                    Recommendation(
                        source=RecommendationSource.COMPLIANCE,
                        zone=None,
                        priority=source_priority + offset,
                        message=COMPLIANCE_MESSAGE_TEMPLATE.format(
                            framework=violation.framework.value.upper().replace("_", " "),
                            recommendation=violation.recommendation,
                            title=violation.title,
                        ),
                        reason=f"compliance_rule:{violation.rule_code}",
                    )
                )
        return recommendations
