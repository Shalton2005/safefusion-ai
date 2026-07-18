"""Compound Risk Engine: aggregates rule matches into per-zone results."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.services.compound_risk.rules import CompoundRiskRule
from src.services.compound_risk.schemas import (
    DEFAULT_RULE_CONFIDENCE,
    CompoundRiskLevelBands,
    ZoneCompoundRiskResult,
)


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
        maintenance_summary: dict | None = None,
    ) -> list[ZoneCompoundRiskResult]:
        """Run every configured rule and return a compound risk result per affected zone.

        Args:
            sensor_summary: Latest sensor telemetry, as returned by
                ``SensorMonitoringService.get_monitoring_summary()``.
            permit_summary: Latest permit validation state, as returned by
                ``PermitValidationService.build_validation_summary()``.
            worker_summary: Latest worker location, as returned by
                ``WorkerMonitoringService.get_monitoring_summary()``.
            maintenance_summary: Equipment-health signal derived from
                maintenance history, as returned by
                ``MaintenanceMonitoringService.get_monitoring_summary()``.
                Optional and keyword-only in practice (added after the
                first three) so existing positional-free callers are
                unaffected by its addition.
        """
        matches_by_zone: dict[str, list] = {}

        for rule in self.rules:
            rule_matches = rule.evaluate(sensor_summary, permit_summary, worker_summary, maintenance_summary)
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
                    confidence=self._aggregate_confidence(matches),
                )
            )

        results.sort(key=lambda result: result.risk_score, reverse=True)
        return results

    @staticmethod
    def _aggregate_confidence(matches: list) -> float:
        """Points-weighted average confidence across a zone's triggered rules.

        Weighting by points means a low-confidence rule that only
        contributes a small fraction of the score has a proportionally
        small effect on the overall confidence, while a low-confidence
        rule driving most of the score pulls the aggregate down
        significantly — the confidence should track how much of the
        *score* rests on shaky evidence, not just how many rules were shaky.
        """
        if not matches:
            return DEFAULT_RULE_CONFIDENCE

        total_points = sum(match.points for match in matches)
        if total_points <= 0:
            return sum(match.confidence for match in matches) / len(matches)

        weighted = sum(match.points * match.confidence for match in matches)
        return round(weighted / total_points, 3)
