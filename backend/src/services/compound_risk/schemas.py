"""Dataclasses shared by the compound risk rule engine and service."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from src.models.enums import RiskLevel

#: Default confidence assigned to a rule match that does not compute its own.
#: Matches the engine's historical (pre-confidence) behavior of treating every
#: triggered rule as fully trusted, so old rule implementations that don't
#: pass ``confidence`` keep producing the same effective result.
DEFAULT_RULE_CONFIDENCE = 1.0


@dataclass(frozen=True)
class CompoundRiskRuleMatch:
    """A single compound rule that fired for one zone.

    Attributes:
        rule_name: Stable machine-readable identifier for the rule.
        points: Point contribution (out of 100) this match adds.
        explanation: Human-readable reason the rule fired.
        evidence: Structured data backing this match — the concrete
            readings/records the rule inspected (e.g. sensor values,
            permit states, maintenance ratios), so a caller can show
            *why* without re-deriving it from raw summaries. Optional and
            additive: defaults to an empty dict, so existing rules that
            don't pass it are unaffected.
        confidence: How much this specific match should be trusted,
            in ``[0.0, 1.0]``. Rules that only ever observe complete,
            unambiguous data (e.g. exact status/state comparisons) can
            leave this at the default full confidence; rules that
            derive a signal from incomplete or inferred data (e.g. no
            equipment health field exists, so it's inferred from
            maintenance-log ratios) should report a lower value.
    """

    rule_name: str
    points: float
    explanation: str
    evidence: dict[str, Any] = field(default_factory=dict)
    confidence: float = DEFAULT_RULE_CONFIDENCE


@dataclass(frozen=True)
class ZoneCompoundRiskResult:
    """Computed compound risk outcome for a single zone.

    Attributes:
        zone: Plant zone this result covers.
        risk_score: Aggregated 0-100 compound risk score.
        risk_level: ``risk_score`` classified via the engine's configured bands.
        triggered_rules: Every rule match that contributed to this result.
        confidence: Overall confidence in this zone's result, in
            ``[0.0, 1.0]`` — the points-weighted average of each triggered
            rule's own ``confidence``. ``1.0`` (full confidence) when no
            rules triggered, matching the "nothing to doubt" case.
    """

    zone: str
    risk_score: float
    risk_level: RiskLevel
    triggered_rules: list[CompoundRiskRuleMatch]
    confidence: float = DEFAULT_RULE_CONFIDENCE

    @property
    def contributing_factors(self) -> list[CompoundRiskRuleMatch]:
        """Alias for ``triggered_rules`` using the engine-family-wide naming.

        ``src.services.risk_scoring.ZoneRiskResult`` calls its equivalent
        list ``contributing_factors``; this property lets a caller use
        either name against a ``ZoneCompoundRiskResult`` without forcing a
        rename of ``triggered_rules``, which existing response schemas and
        tests already depend on by that name.
        """
        return self.triggered_rules

    @property
    def evidence(self) -> dict[str, Any]:
        """Combined evidence from every triggered rule, keyed by rule name.

        Zones with no triggered rules get an empty dict. A rule name that
        somehow triggers more than once for a zone keeps its last match's
        evidence (rules are expected to contribute at most one match per
        zone, matching every existing rule's ``dict[str, ...]`` return shape).
        """
        return {match.rule_name: match.evidence for match in self.triggered_rules}

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
