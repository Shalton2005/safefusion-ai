"""Tests for the Risk Explanation Generator."""

from __future__ import annotations

from src.models.enums import RiskLevel
from src.services.compound_risk.schemas import CompoundRiskRuleMatch, ZoneCompoundRiskResult
from src.services.risk_explanation import ExplainedRule, RiskExplanationGenerator
from src.services.risk_scoring import RiskFactorContribution, ZoneRiskResult


class TestExplainedRuleAdapters:
    def test_from_factor_contribution(self) -> None:
        contribution = RiskFactorContribution(
            name="critical_sensors", points=40.0, weight=40.0, detail="1/1 sensors critical"
        )
        rule = ExplainedRule.from_factor_contribution(contribution)
        assert rule.rule_label == "critical_sensors"
        assert rule.points == 40.0
        assert rule.reason == "1/1 sensors critical"

    def test_from_compound_rule_match(self) -> None:
        match = CompoundRiskRuleMatch(
            rule_name="critical_sensor_without_active_permit",
            points=35.0,
            explanation="Zone 'A' has 1 critical sensor reading(s) with no valid active permit.",
        )
        rule = ExplainedRule.from_compound_rule_match(match)
        assert rule.rule_label == "critical_sensor_without_active_permit"
        assert rule.points == 35.0
        assert "critical sensor" in rule.reason


class TestRiskExplanationGenerator:
    def test_explain_produces_one_bullet_per_rule(self) -> None:
        generator = RiskExplanationGenerator()
        rules = [
            ExplainedRule(rule_label="gas_critical", points=40.0, reason="Gas sensor exceeded threshold"),
            ExplainedRule(rule_label="expired_permit", points=20.0, reason="Permit expired"),
        ]
        bullets = generator.explain(RiskLevel.CRITICAL, rules)
        assert bullets == [
            "- Critical Risk detected because Gas sensor exceeded threshold.",
            "- Critical Risk detected because Permit expired.",
        ]

    def test_matches_documented_example_format(self) -> None:
        generator = RiskExplanationGenerator()
        rules = [ExplainedRule(rule_label="gas_critical", points=40.0, reason="Gas sensor exceeded threshold")]
        bullets = generator.explain(RiskLevel.CRITICAL, rules)
        assert bullets == ["- Critical Risk detected because Gas sensor exceeded threshold."]

    def test_no_double_period_when_reason_already_ends_with_period(self) -> None:
        generator = RiskExplanationGenerator()
        rules = [ExplainedRule(rule_label="x", points=10.0, reason="Something happened.")]
        bullets = generator.explain(RiskLevel.LOW, rules)
        assert bullets == ["- Low Risk detected because Something happened."]

    def test_empty_rules_returns_empty_list(self) -> None:
        generator = RiskExplanationGenerator()
        assert generator.explain(RiskLevel.LOW, []) == []

    def test_explain_zone_includes_zone_label(self) -> None:
        generator = RiskExplanationGenerator()
        rules = [ExplainedRule(rule_label="gas_critical", points=40.0, reason="Gas sensor exceeded threshold")]
        bullets = generator.explain_zone("Zone-A", RiskLevel.CRITICAL, rules)
        assert bullets == ["- [Zone-A] Critical Risk detected because Gas sensor exceeded threshold."]

    def test_custom_bullet_prefix(self) -> None:
        generator = RiskExplanationGenerator()
        rules = [ExplainedRule(rule_label="x", points=10.0, reason="Reason")]
        bullets = generator.explain(RiskLevel.LOW, rules, bullet="*")
        assert bullets == ["* Low Risk detected because Reason."]

    def test_summarize_joins_bullets_with_newlines(self) -> None:
        generator = RiskExplanationGenerator()
        rules = [
            ExplainedRule(rule_label="a", points=10.0, reason="First reason"),
            ExplainedRule(rule_label="b", points=10.0, reason="Second reason"),
        ]
        summary = generator.summarize(RiskLevel.MEDIUM, rules)
        assert summary == (
            "- Medium Risk detected because First reason.\n- Medium Risk detected because Second reason."
        )

    def test_summarize_no_rules(self) -> None:
        generator = RiskExplanationGenerator()
        assert generator.summarize(RiskLevel.LOW, []) == "No risk conditions detected."


class TestBulletExplanationsIntegration:
    def test_zone_risk_result_bullet_explanations(self) -> None:
        result = ZoneRiskResult(
            zone="Zone-A",
            score=40.0,
            risk_level=RiskLevel.MEDIUM,
            contributing_factors=[
                RiskFactorContribution(
                    name="critical_sensors", points=40.0, weight=40.0, detail="1/1 sensors critical"
                )
            ],
        )
        assert result.bullet_explanations == ["- Medium Risk detected because 1/1 sensors critical."]

    def test_zone_compound_risk_result_bullet_explanations(self) -> None:
        result = ZoneCompoundRiskResult(
            zone="Zone-B",
            risk_score=35.0,
            risk_level=RiskLevel.MEDIUM,
            triggered_rules=[
                CompoundRiskRuleMatch(
                    rule_name="critical_sensor_without_active_permit",
                    points=35.0,
                    explanation="Zone 'Zone-B' has 1 critical sensor reading(s) with no valid active permit.",
                )
            ],
        )
        assert result.bullet_explanations == [
            "- Medium Risk detected because Zone 'Zone-B' has 1 critical sensor reading(s) "
            "with no valid active permit."
        ]

    def test_empty_contributing_factors_gives_no_bullets(self) -> None:
        result = ZoneRiskResult(zone="Zone-C", score=0.0, risk_level=RiskLevel.LOW, contributing_factors=[])
        assert result.bullet_explanations == []
