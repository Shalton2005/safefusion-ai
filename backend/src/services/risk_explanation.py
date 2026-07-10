"""Risk Explanation Generator for SafeFusion AI.

Converts triggered risk rules/factors — from the per-zone
``RiskScoreEngine`` or the ``CompoundRiskEngine`` — into human-readable,
bullet-style explanations. Purely templated string formatting: no LLM,
no NLP model, no external calls. Reusable across any engine whose
triggered items expose a name, a point contribution, and a detail/reason
string.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from src.models.enums import RiskLevel

if TYPE_CHECKING:
    from src.services.compound_risk.schemas import CompoundRiskRuleMatch
    from src.services.risk_scoring import RiskFactorContribution


@dataclass(frozen=True)
class ExplainedRule:
    """Normalized view of a single triggered rule, ready for text rendering."""

    rule_label: str
    points: float
    reason: str

    @classmethod
    def from_factor_contribution(cls, contribution: RiskFactorContribution) -> ExplainedRule:
        """Adapt a ``risk_scoring.RiskFactorContribution`` into an ``ExplainedRule``."""
        return cls(rule_label=contribution.name, points=contribution.points, reason=contribution.detail)

    @classmethod
    def from_compound_rule_match(cls, match: CompoundRiskRuleMatch) -> ExplainedRule:
        """Adapt a ``compound_risk.CompoundRiskRuleMatch`` into an ``ExplainedRule``."""
        return cls(rule_label=match.rule_name, points=match.points, reason=match.explanation)


def _sentence(reason: str) -> str:
    """Return ``reason`` as a single sentence ending in exactly one period."""
    return f"{reason.rstrip('.')}."


RISK_LEVEL_LABELS: dict[RiskLevel, str] = {
    RiskLevel.LOW: "Low Risk",
    RiskLevel.MEDIUM: "Medium Risk",
    RiskLevel.HIGH: "High Risk",
    RiskLevel.CRITICAL: "Critical Risk",
}


class RiskExplanationGenerator:
    """Generates reusable, bullet-style explanations from triggered risk rules.

    Rule-based text templating only — no AI/ML involved. Each triggered
    rule becomes one bullet line of the form::

        "- <Risk Level> detected because <reason>."
    """

    def explain(
        self,
        risk_level: RiskLevel,
        triggered_rules: list[ExplainedRule],
        bullet: str = "-",
    ) -> list[str]:
        """Return one bullet line per triggered rule.

        Args:
            risk_level: The overall classified risk level the rules contributed to.
            triggered_rules: Normalized triggered rules to explain.
            bullet: Prefix used for each line (default ``"-"``).

        Returns:
            A list of bullet-style explanation strings, e.g.::

                ["- Critical Risk detected because Gas sensor exceeded threshold."]

            Empty list if no rules were triggered.
        """
        if not triggered_rules:
            return []

        level_label = RISK_LEVEL_LABELS[risk_level]
        return [f"{bullet} {level_label} detected because {_sentence(rule.reason)}" for rule in triggered_rules]

    def explain_zone(
        self,
        zone: str,
        risk_level: RiskLevel,
        triggered_rules: list[ExplainedRule],
        bullet: str = "-",
    ) -> list[str]:
        """Return one bullet line per triggered rule, prefixed with the zone name.

        Same as :meth:`explain` but includes ``zone`` for callers reporting
        across multiple zones at once.
        """
        if not triggered_rules:
            return []

        level_label = RISK_LEVEL_LABELS[risk_level]
        return [
            f"{bullet} [{zone}] {level_label} detected because {_sentence(rule.reason)}"
            for rule in triggered_rules
        ]

    def summarize(self, risk_level: RiskLevel, triggered_rules: list[ExplainedRule]) -> str:
        """Return all bullet lines for a set of triggered rules, joined by newlines."""
        bullets = self.explain(risk_level, triggered_rules)
        if not bullets:
            return "No risk conditions detected."
        return "\n".join(bullets)
