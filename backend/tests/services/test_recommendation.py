"""Tests for the Recommendation generators, engine, and service."""

from __future__ import annotations

from src.models.enums import (
    ComplianceFramework,
    ComplianceStatus,
    EmergencyActionType,
    RecommendationSource,
    RiskLevel,
)
from src.services.compliance.schemas import ComplianceViolation, IncidentComplianceResult
from src.services.compound_risk.schemas import CompoundRiskRuleMatch, ZoneCompoundRiskResult
from src.services.emergency_response.schemas import EmergencyActionMatch, ZoneEmergencyResponseResult
from src.services.recommendation.engine import RecommendationEngine
from src.services.recommendation.generators import (
    ComplianceRecommendationGenerator,
    CompoundRiskRecommendationGenerator,
    EmergencyResponseRecommendationGenerator,
)
from src.services.recommendation.recommendation_service import RecommendationService


def _compound_risk_result(zone: str, level: RiskLevel, score: float = 50.0) -> ZoneCompoundRiskResult:
    return ZoneCompoundRiskResult(
        zone=zone,
        risk_score=score,
        risk_level=level,
        triggered_rules=[CompoundRiskRuleMatch(rule_name="test_rule", points=score, explanation="test")],
    )


def _emergency_result(
    zone: str, actions: list[EmergencyActionType], level: RiskLevel = RiskLevel.HIGH
) -> ZoneEmergencyResponseResult:
    return ZoneEmergencyResponseResult(
        zone=zone,
        risk_score=80.0,
        risk_level=level,
        actions=[
            EmergencyActionMatch(action=action, triggered_by_rule="rule", explanation="test")
            for action in actions
        ],
    )


def _compliance_result(framework: ComplianceFramework, rule_code: str = "rule_a") -> IncidentComplianceResult:
    return IncidentComplianceResult(
        incident_id="incident-1",
        status=ComplianceStatus.NON_COMPLIANT,
        violations=[
            ComplianceViolation(
                rule_code=rule_code,
                framework=framework,
                title="Test Rule",
                description="desc",
                recommendation="Do the thing.",
            )
        ],
    )


def _engine() -> RecommendationEngine:
    return RecommendationEngine(
        compound_risk_generator=CompoundRiskRecommendationGenerator(),
        emergency_response_generator=EmergencyResponseRecommendationGenerator(),
        compliance_generator=ComplianceRecommendationGenerator(),
    )


class TestCompoundRiskRecommendationGenerator:
    def test_generates_one_recommendation_per_zone(self) -> None:
        generator = CompoundRiskRecommendationGenerator()
        recommendations = generator.generate(
            [_compound_risk_result("Zone-A", RiskLevel.CRITICAL), _compound_risk_result("Zone-B", RiskLevel.LOW)]
        )
        assert len(recommendations) == 2
        assert {r.zone for r in recommendations} == {"Zone-A", "Zone-B"}
        assert all(r.source == RecommendationSource.COMPOUND_RISK for r in recommendations)

    def test_critical_zone_has_lower_priority_number_than_low(self) -> None:
        generator = CompoundRiskRecommendationGenerator()
        critical, low = generator.generate(
            [_compound_risk_result("Zone-A", RiskLevel.CRITICAL), _compound_risk_result("Zone-B", RiskLevel.LOW)]
        )
        assert critical.priority < low.priority


class TestEmergencyResponseRecommendationGenerator:
    def test_generates_one_recommendation_per_action(self) -> None:
        generator = EmergencyResponseRecommendationGenerator()
        recommendations = generator.generate(
            [_emergency_result("Zone-A", [EmergencyActionType.EVACUATE_AREA, EmergencyActionType.STOP_WORK])]
        )
        assert len(recommendations) == 2
        assert all(r.source == RecommendationSource.EMERGENCY_RESPONSE for r in recommendations)

    def test_evacuate_ranks_before_notify(self) -> None:
        generator = EmergencyResponseRecommendationGenerator()
        recommendations = generator.generate(
            [
                _emergency_result(
                    "Zone-A",
                    [EmergencyActionType.NOTIFY_SAFETY_OFFICER, EmergencyActionType.EVACUATE_AREA],
                )
            ]
        )
        by_action = {r.reason: r.priority for r in recommendations}
        assert by_action["emergency_action:evacuate_area"] < by_action["emergency_action:notify_safety_officer"]


class TestComplianceRecommendationGenerator:
    def test_generates_one_recommendation_per_violation(self) -> None:
        generator = ComplianceRecommendationGenerator()
        recommendations = generator.generate(
            [_compliance_result(ComplianceFramework.OISD), _compliance_result(ComplianceFramework.DGMS, "rule_b")]
        )
        assert len(recommendations) == 2
        assert all(r.source == RecommendationSource.COMPLIANCE for r in recommendations)
        assert all(r.zone is None for r in recommendations)

    def test_message_includes_framework_and_recommendation(self) -> None:
        generator = ComplianceRecommendationGenerator()
        [recommendation] = generator.generate([_compliance_result(ComplianceFramework.OISD)])
        assert "OISD" in recommendation.message
        assert "Do the thing." in recommendation.message


class TestRecommendationEngine:
    def test_emergency_response_sorts_before_compound_risk_and_compliance(self) -> None:
        engine = _engine()
        recommendations = engine.generate(
            compound_risk_results=[_compound_risk_result("Zone-A", RiskLevel.CRITICAL)],
            emergency_response_results=[_emergency_result("Zone-A", [EmergencyActionType.EVACUATE_AREA])],
            compliance_results=[_compliance_result(ComplianceFramework.DGMS)],
        )
        sources = [r.source for r in recommendations]
        assert sources == [
            RecommendationSource.EMERGENCY_RESPONSE,
            RecommendationSource.COMPOUND_RISK,
            RecommendationSource.COMPLIANCE,
        ]

    def test_missing_sources_contribute_nothing(self) -> None:
        engine = _engine()
        recommendations = engine.generate(compound_risk_results=[_compound_risk_result("Zone-A", RiskLevel.HIGH)])
        assert len(recommendations) == 1
        assert recommendations[0].source == RecommendationSource.COMPOUND_RISK

    def test_no_sources_returns_empty_list(self) -> None:
        engine = _engine()
        assert engine.generate() == []

    def test_result_is_sorted_by_priority_ascending(self) -> None:
        engine = _engine()
        recommendations = engine.generate(
            compound_risk_results=[
                _compound_risk_result("Zone-A", RiskLevel.LOW),
                _compound_risk_result("Zone-B", RiskLevel.CRITICAL),
            ]
        )
        priorities = [r.priority for r in recommendations]
        assert priorities == sorted(priorities)


class _StubCompoundRisk:
    def __init__(self, results: list[ZoneCompoundRiskResult]) -> None:
        self._results = results

    def detect_compound_risks(self) -> list[ZoneCompoundRiskResult]:
        return self._results


class _StubEmergencyResponse:
    def __init__(self, results: list[ZoneEmergencyResponseResult]) -> None:
        self._results = results

    def respond(self, zone_results: list[ZoneCompoundRiskResult]) -> list[ZoneEmergencyResponseResult]:
        return self._results


class _StubCompliance:
    def __init__(self, results: list[IncidentComplianceResult]) -> None:
        self._results = results

    def evaluate_all_incidents(self, skip: int = 0, limit: int = 100) -> list[IncidentComplianceResult]:
        return self._results


class TestRecommendationService:
    def test_generate_recommendations_pulls_from_all_three_sources(self) -> None:
        service = RecommendationService(
            engine=_engine(),
            compound_risk=_StubCompoundRisk([_compound_risk_result("Zone-A", RiskLevel.HIGH)]),
            emergency_response=_StubEmergencyResponse(
                [_emergency_result("Zone-A", [EmergencyActionType.STOP_WORK])]
            ),
            compliance=_StubCompliance([_compliance_result(ComplianceFramework.FACTORY_ACT)]),
        )

        recommendations = service.generate_recommendations()

        assert len(recommendations) == 3
        assert recommendations[0].source == RecommendationSource.EMERGENCY_RESPONSE

    def test_generate_recommendations_with_no_ports_returns_empty(self) -> None:
        service = RecommendationService(engine=_engine())
        assert service.generate_recommendations() == []

    def test_evaluate_uses_explicitly_supplied_results(self) -> None:
        service = RecommendationService(engine=_engine())
        recommendations = service.evaluate(
            compound_risk_results=[_compound_risk_result("Zone-A", RiskLevel.MEDIUM)]
        )
        assert len(recommendations) == 1
