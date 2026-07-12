"""Tests for the Compliance Rule Engine and service."""

from __future__ import annotations

import uuid

from src.config.compliance_rules import ComplianceRuleConfig
from src.models.enums import ComplianceFramework, ComplianceStatus, IncidentType, SeverityLevel
from src.models.incident import Incident
from src.services.compliance.compliance_service import ComplianceService
from src.services.compliance.engine import ComplianceRuleEngine
from src.services.compliance.rules import IncidentAttributeComplianceRule


def _incident(
    incident_type: IncidentType = IncidentType.GAS_LEAK,
    severity: SeverityLevel = SeverityLevel.MEDIUM,
    zone: str = "Zone-A",
) -> Incident:
    return Incident(
        id=uuid.uuid4(),
        zone=zone,
        severity=severity,
        incident_type=incident_type,
        description="Test incident",
        occurred_at=None,
    )


def _rule(
    code: str = "test_rule",
    framework: ComplianceFramework = ComplianceFramework.FACTORY_ACT,
    applies_to: tuple[IncidentType, ...] = (),
    minimum_severity: SeverityLevel | None = None,
) -> IncidentAttributeComplianceRule:
    return IncidentAttributeComplianceRule(
        ComplianceRuleConfig(
            code=code,
            framework=framework,
            title="Test Rule",
            description="A test compliance rule.",
            applies_to_incident_types=applies_to,
            minimum_severity=minimum_severity,
            recommendation="Do the corrective thing.",
        )
    )


class TestIncidentAttributeComplianceRule:
    def test_fires_for_any_incident_type_when_unrestricted(self) -> None:
        rule = _rule(applies_to=())
        violation = rule.evaluate(_incident(incident_type=IncidentType.PPE_VIOLATION))
        assert violation is not None
        assert violation.rule_code == "test_rule"

    def test_does_not_fire_for_non_matching_incident_type(self) -> None:
        rule = _rule(applies_to=(IncidentType.FIRE,))
        violation = rule.evaluate(_incident(incident_type=IncidentType.GAS_LEAK))
        assert violation is None

    def test_fires_for_matching_incident_type(self) -> None:
        rule = _rule(applies_to=(IncidentType.GAS_LEAK,))
        violation = rule.evaluate(_incident(incident_type=IncidentType.GAS_LEAK))
        assert violation is not None

    def test_does_not_fire_below_minimum_severity(self) -> None:
        rule = _rule(minimum_severity=SeverityLevel.CRITICAL)
        violation = rule.evaluate(_incident(severity=SeverityLevel.HIGH))
        assert violation is None

    def test_fires_at_or_above_minimum_severity(self) -> None:
        rule = _rule(minimum_severity=SeverityLevel.HIGH)
        violation = rule.evaluate(_incident(severity=SeverityLevel.CRITICAL))
        assert violation is not None

    def test_violation_has_no_citations_by_default(self) -> None:
        rule = _rule()
        violation = rule.evaluate(_incident())
        assert violation is not None
        assert violation.citations == ()


class TestComplianceRuleEngine:
    def test_compliant_when_no_rule_fires(self) -> None:
        engine = ComplianceRuleEngine(rules=[_rule(applies_to=(IncidentType.FIRE,))])
        result = engine.evaluate(_incident(incident_type=IncidentType.GAS_LEAK))
        assert result.status == ComplianceStatus.COMPLIANT
        assert result.violations == []

    def test_non_compliant_when_a_rule_fires(self) -> None:
        engine = ComplianceRuleEngine(rules=[_rule(applies_to=(IncidentType.GAS_LEAK,))])
        result = engine.evaluate(_incident(incident_type=IncidentType.GAS_LEAK))
        assert result.status == ComplianceStatus.NON_COMPLIANT
        assert len(result.violations) == 1

    def test_multiple_rules_can_fire_for_one_incident(self) -> None:
        engine = ComplianceRuleEngine(
            rules=[
                _rule(code="rule_a", framework=ComplianceFramework.FACTORY_ACT),
                _rule(code="rule_b", framework=ComplianceFramework.OISD),
            ]
        )
        result = engine.evaluate(_incident())
        assert len(result.violations) == 2
        assert set(result.violated_frameworks) == {
            ComplianceFramework.FACTORY_ACT,
            ComplianceFramework.OISD,
        }

    def test_recommendations_are_deduplicated(self) -> None:
        engine = ComplianceRuleEngine(
            rules=[_rule(code="rule_a"), _rule(code="rule_b")]
        )
        result = engine.evaluate(_incident())
        assert result.recommendations == ["Do the corrective thing."]

    def test_evaluate_many_returns_one_result_per_incident(self) -> None:
        engine = ComplianceRuleEngine(rules=[_rule(applies_to=(IncidentType.FIRE,))])
        results = engine.evaluate_many(
            [_incident(incident_type=IncidentType.FIRE), _incident(incident_type=IncidentType.GAS_LEAK)]
        )
        assert len(results) == 2
        assert results[0].status == ComplianceStatus.NON_COMPLIANT
        assert results[1].status == ComplianceStatus.COMPLIANT


class _StubKnowledgeSource:
    def __init__(self, citations: tuple[str, ...]) -> None:
        self._citations = citations

    def get_citations(self, rule_code: str) -> tuple[str, ...]:
        return self._citations


class TestKnowledgeSourceSeam:
    def test_violation_enriched_with_citations_when_source_returns_them(self) -> None:
        engine = ComplianceRuleEngine(
            rules=[_rule()],
            knowledge_source=_StubKnowledgeSource(("OISD 105, clause 4.2",)),
        )
        result = engine.evaluate(_incident())
        assert result.violations[0].citations == ("OISD 105, clause 4.2",)

    def test_null_knowledge_source_is_the_default(self) -> None:
        engine = ComplianceRuleEngine(rules=[_rule()])
        result = engine.evaluate(_incident())
        assert result.violations[0].citations == ()


class _StubIncidentRepository:
    def __init__(self, incidents: dict[uuid.UUID, Incident]) -> None:
        self._incidents = incidents

    def get_by_id(self, record_id: uuid.UUID) -> Incident | None:
        return self._incidents.get(record_id)

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Incident]:
        return list(self._incidents.values())[skip : skip + limit]


class TestComplianceService:
    def test_evaluate_incident_by_id_returns_result(self) -> None:
        incident = _incident(incident_type=IncidentType.GAS_LEAK)
        engine = ComplianceRuleEngine(rules=[_rule(applies_to=(IncidentType.GAS_LEAK,))])
        service = ComplianceService(
            engine=engine, incident_repository=_StubIncidentRepository({incident.id: incident})
        )

        result = service.evaluate_incident_by_id(incident.id)

        assert result is not None
        assert result.status == ComplianceStatus.NON_COMPLIANT

    def test_evaluate_incident_by_id_returns_none_when_missing(self) -> None:
        engine = ComplianceRuleEngine(rules=[])
        service = ComplianceService(engine=engine, incident_repository=_StubIncidentRepository({}))

        assert service.evaluate_incident_by_id(uuid.uuid4()) is None

    def test_evaluate_incident_by_id_returns_none_without_repository(self) -> None:
        engine = ComplianceRuleEngine(rules=[])
        service = ComplianceService(engine=engine, incident_repository=None)

        assert service.evaluate_incident_by_id(uuid.uuid4()) is None

    def test_evaluate_all_incidents_returns_one_result_per_incident(self) -> None:
        incidents = {uuid.uuid4(): _incident() for _ in range(3)}
        engine = ComplianceRuleEngine(rules=[_rule()])
        service = ComplianceService(
            engine=engine, incident_repository=_StubIncidentRepository(incidents)
        )

        results = service.evaluate_all_incidents()

        assert len(results) == 3

    def test_evaluate_all_incidents_returns_empty_without_repository(self) -> None:
        engine = ComplianceRuleEngine(rules=[])
        service = ComplianceService(engine=engine, incident_repository=None)

        assert service.evaluate_all_incidents() == []
