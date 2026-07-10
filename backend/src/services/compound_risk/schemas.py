"""Dataclasses shared by the compound risk rule engine and service."""

from __future__ import annotations

from dataclasses import dataclass

from src.models.enums import RiskLevel


@dataclass(frozen=True)
class CompoundRiskRuleMatch:
    """A single compound rule that fired for one zone."""

    rule_name: str
    points: float
    explanation: str


@dataclass(frozen=True)
class ZoneCompoundRiskResult:
    """Computed compound risk outcome for a single zone."""

    zone: str
    risk_score: float
    risk_level: RiskLevel
    triggered_rules: list[CompoundRiskRuleMatch]

    @property
    def explanation(self) -> str:
        """Human-readable summary of every triggered rule for this zone."""
        if not self.triggered_rules:
            return "No compound risk conditions detected."
        return " ".join(match.explanation for match in self.triggered_rules)

    @property
    def bullet_explanations(self) -> list[str]:
        """Bullet-style explanation lines, one per triggered rule.

        Delegates to :class:`src.services.risk_explanation.RiskExplanationGenerator`
        so all engines produce explanations in a single, reusable format.
        """
        from src.services.risk_explanation import ExplainedRule, RiskExplanationGenerator

        generator = RiskExplanationGenerator()
        explained = [ExplainedRule.from_compound_rule_match(match) for match in self.triggered_rules]
        return generator.explain(self.risk_level, explained)


@dataclass(frozen=True)
class CompoundRiskLevelBands:
    """Configurable score thresholds mapping a compound score to a ``RiskLevel``."""

    low_max: float = 20.0
    medium_max: float = 45.0
    high_max: float = 70.0

    def classify(self, score: float) -> RiskLevel:
        if score <= self.low_max:
            return RiskLevel.LOW
        if score <= self.medium_max:
            return RiskLevel.MEDIUM
        if score <= self.high_max:
            return RiskLevel.HIGH
        return RiskLevel.CRITICAL
