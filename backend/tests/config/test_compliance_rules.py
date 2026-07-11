"""Tests for the centralised compliance rule configuration."""

from __future__ import annotations

from src.config.compliance_rules import COMPLIANCE_RULES, severity_at_least
from src.models.enums import ComplianceFramework, SeverityLevel


class TestComplianceRules:
    def test_registry_is_not_empty(self) -> None:
        assert len(COMPLIANCE_RULES) > 0

    def test_registry_keys_match_rule_codes(self) -> None:
        for code, rule in COMPLIANCE_RULES.items():
            assert rule.code == code

    def test_every_rule_has_a_recommendation(self) -> None:
        for rule in COMPLIANCE_RULES.values():
            assert rule.recommendation

    def test_every_rule_has_a_description(self) -> None:
        for rule in COMPLIANCE_RULES.values():
            assert rule.description

    def test_all_three_frameworks_are_represented(self) -> None:
        frameworks = {rule.framework for rule in COMPLIANCE_RULES.values()}
        assert frameworks == {
            ComplianceFramework.FACTORY_ACT,
            ComplianceFramework.OISD,
            ComplianceFramework.DGMS,
        }


class TestSeverityAtLeast:
    def test_equal_severity_is_at_least(self) -> None:
        assert severity_at_least(SeverityLevel.HIGH, SeverityLevel.HIGH) is True

    def test_higher_severity_is_at_least(self) -> None:
        assert severity_at_least(SeverityLevel.CRITICAL, SeverityLevel.HIGH) is True

    def test_lower_severity_is_not_at_least(self) -> None:
        assert severity_at_least(SeverityLevel.LOW, SeverityLevel.HIGH) is False
