"""Compound Risk Engine: aggregates rule matches into per-zone results."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.services.compound_risk.rules import CompoundRiskRule
from src.services.compound_risk.schemas import CompoundRiskLevelBands, ZoneCompoundRiskResult


@dataclass
class CompoundRiskEngine:
    """Evaluates configured compound rules and produces a per-zone risk result."""

    rules: list[CompoundRiskRule] = field(default_factory=list)
    level_bands: CompoundRiskLevelBands = field(default_factory=CompoundRiskLevelBands)

    def evaluate(
        self,
        sensor_summary: dict | None = None,
        permit_summary: dict | None = None,
        worker_summary: dict | None = None,
    ) -> list[ZoneCompoundRiskResult]:
        """Run every configured rule and return a compound risk result per affected zone."""
        matches_by_zone: dict[str, list] = {}

        for rule in self.rules:
            rule_matches = rule.evaluate(sensor_summary, permit_summary, worker_summary)
            for zone, match in rule_matches.items():
                matches_by_zone.setdefault(zone, []).append(match)

        results: list[ZoneCompoundRiskResult] = []
        for zone, matches in matches_by_zone.items():
            raw_score = sum(match.points for match in matches)
            score = max(0.0, min(100.0, raw_score))
            results.append(
                ZoneCompoundRiskResult(
                    zone=zone,
                    risk_score=round(score, 2),
                    risk_level=self.level_bands.classify(score),
                    triggered_rules=matches,
                )
            )

        results.sort(key=lambda result: result.risk_score, reverse=True)
        return results
