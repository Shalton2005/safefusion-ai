"""Rule-based Risk Score Engine for SafeFusion AI (v1).

Combines monitoring outputs (sensor, permit, worker) into a single
weighted risk score per zone. Each factor is an independent, pluggable
component that contributes a bounded number of points to the overall
score — new factors can be added without touching the engine or other
factors.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from src.models.enums import RiskLevel


@dataclass(frozen=True)
class RiskFactorContribution:
    """A single factor's contribution to one zone's risk score."""

    name: str
    points: float
    weight: float
    detail: str

    def describe(self) -> str:
        return f"{self.name}: +{self.points:.1f} pts ({self.detail})"


class RiskFactor(Protocol):
    """Contract implemented by every risk-scoring factor.

    A factor inspects the relevant monitoring summary and returns a
    mapping of zone -> contribution for that factor only. Zones with no
    signal for this factor may be omitted.
    """

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
    ) -> dict[str, RiskFactorContribution]: ...


class CriticalSensorFactor:
    """Points scale with the proportion of critical sensor readings in a zone."""

    def __init__(self, weight: float) -> None:
        self._weight = weight

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
    ) -> dict[str, RiskFactorContribution]:
        if not sensor_summary:
            return {}

        totals: dict[str, dict[str, int]] = {}
        for sensor in sensor_summary.get("sensors", []):
            zone = sensor["zone"]
            counts = totals.setdefault(zone, {"critical": 0, "total": 0})
            counts["total"] += 1
            if sensor["computed_status"] == "critical":
                counts["critical"] += 1

        contributions: dict[str, RiskFactorContribution] = {}
        for zone, counts in totals.items():
            if counts["critical"] == 0:
                continue
            ratio = counts["critical"] / counts["total"]
            points = ratio * self._weight
            contributions[zone] = RiskFactorContribution(
                name="critical_sensors",
                points=points,
                weight=self._weight,
                detail=f"{counts['critical']}/{counts['total']} sensors critical",
            )
        return contributions


class WarningSensorFactor:
    """Points scale with the proportion of warning-level sensor readings in a zone."""

    def __init__(self, weight: float) -> None:
        self._weight = weight

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
    ) -> dict[str, RiskFactorContribution]:
        if not sensor_summary:
            return {}

        totals: dict[str, dict[str, int]] = {}
        for sensor in sensor_summary.get("sensors", []):
            zone = sensor["zone"]
            counts = totals.setdefault(zone, {"warning": 0, "total": 0})
            counts["total"] += 1
            if sensor["computed_status"] == "warning":
                counts["warning"] += 1

        contributions: dict[str, RiskFactorContribution] = {}
        for zone, counts in totals.items():
            if counts["warning"] == 0:
                continue
            ratio = counts["warning"] / counts["total"]
            points = ratio * self._weight
            contributions[zone] = RiskFactorContribution(
                name="warning_sensors",
                points=points,
                weight=self._weight,
                detail=f"{counts['warning']}/{counts['total']} sensors in warning",
            )
        return contributions


class ExpiredPermitFactor:
    """Points scale with the proportion of expired permits in a zone."""

    def __init__(self, weight: float) -> None:
        self._weight = weight

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
    ) -> dict[str, RiskFactorContribution]:
        if not permit_summary:
            return {}

        totals: dict[str, dict[str, int]] = {}
        for permit in permit_summary.get("permits", []):
            zone = permit["zone"]
            counts = totals.setdefault(zone, {"expired": 0, "total": 0})
            counts["total"] += 1
            if permit["validation_state"] == "expired":
                counts["expired"] += 1

        contributions: dict[str, RiskFactorContribution] = {}
        for zone, counts in totals.items():
            if counts["expired"] == 0:
                continue
            ratio = counts["expired"] / counts["total"]
            points = ratio * self._weight
            contributions[zone] = RiskFactorContribution(
                name="expired_permits",
                points=points,
                weight=self._weight,
                detail=f"{counts['expired']}/{counts['total']} permits expired",
            )
        return contributions


class RestrictedZoneWorkerFactor:
    """Points scale with the proportion of workers present in restricted zones."""

    def __init__(self, weight: float, restricted_zones: set[str]) -> None:
        self._weight = weight
        self._restricted_zones = restricted_zones

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
    ) -> dict[str, RiskFactorContribution]:
        if not worker_summary or not self._restricted_zones:
            return {}

        totals: dict[str, dict[str, int]] = {}
        for worker in worker_summary.get("workers", []):
            zone = worker.get("assigned_zone")
            if not zone:
                continue
            counts = totals.setdefault(zone, {"in_restricted": 0, "total": 0})
            counts["total"] += 1
            if zone in self._restricted_zones:
                counts["in_restricted"] += 1

        contributions: dict[str, RiskFactorContribution] = {}
        for zone, counts in totals.items():
            if counts["in_restricted"] == 0:
                continue
            ratio = counts["in_restricted"] / counts["total"]
            points = ratio * self._weight
            contributions[zone] = RiskFactorContribution(
                name="restricted_zone_workers",
                points=points,
                weight=self._weight,
                detail=f"{counts['in_restricted']}/{counts['total']} workers in a restricted zone",
            )
        return contributions


@dataclass(frozen=True)
class ZoneRiskResult:
    """Computed risk outcome for a single zone."""

    zone: str
    score: float
    risk_level: RiskLevel
    contributing_factors: list[RiskFactorContribution]

    def contributing_factors_text(self) -> str:
        if not self.contributing_factors:
            return "No contributing risk factors detected."
        return "; ".join(factor.describe() for factor in self.contributing_factors)

    @property
    def bullet_explanations(self) -> list[str]:
        """Bullet-style explanation lines, one per contributing factor.

        Delegates to :class:`src.services.risk_explanation.RiskExplanationGenerator`
        so all engines produce explanations in a single, reusable format.
        """
        from src.services.risk_explanation import ExplainedRule, RiskExplanationGenerator

        generator = RiskExplanationGenerator()
        explained = [
            ExplainedRule.from_factor_contribution(factor) for factor in self.contributing_factors
        ]
        return generator.explain(self.risk_level, explained)


@dataclass(frozen=True)
class RiskLevelBands:
    """Configurable score thresholds mapping to a ``RiskLevel``."""

    low_max: float = 25.0
    medium_max: float = 50.0
    high_max: float = 75.0

    def classify(self, score: float) -> RiskLevel:
        if score <= self.low_max:
            return RiskLevel.LOW
        if score <= self.medium_max:
            return RiskLevel.MEDIUM
        if score <= self.high_max:
            return RiskLevel.HIGH
        return RiskLevel.CRITICAL


@dataclass
class RiskScoreEngine:
    """Combines pluggable risk factors into a per-zone weighted risk score (v1)."""

    factors: list[RiskFactor] = field(default_factory=list)
    level_bands: RiskLevelBands = field(default_factory=RiskLevelBands)

    def calculate(
        self,
        sensor_summary: dict | None = None,
        permit_summary: dict | None = None,
        worker_summary: dict | None = None,
    ) -> list[ZoneRiskResult]:
        """Evaluate all configured factors and return a risk result per zone."""
        per_zone_contributions: dict[str, list[RiskFactorContribution]] = {}

        for factor in self.factors:
            factor_contributions = factor.evaluate(sensor_summary, permit_summary, worker_summary)
            for zone, contribution in factor_contributions.items():
                per_zone_contributions.setdefault(zone, []).append(contribution)

        results: list[ZoneRiskResult] = []
        for zone, contributions in per_zone_contributions.items():
            raw_score = sum(contribution.points for contribution in contributions)
            score = max(0.0, min(100.0, raw_score))
            results.append(
                ZoneRiskResult(
                    zone=zone,
                    score=round(score, 2),
                    risk_level=self.level_bands.classify(score),
                    contributing_factors=contributions,
                )
            )

        results.sort(key=lambda result: result.score, reverse=True)
        return results
