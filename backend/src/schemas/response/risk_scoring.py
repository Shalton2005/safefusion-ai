"""Response schemas for the rule-based Risk Score Engine (v1)."""

from src.models.enums import RiskLevel
from src.schemas.base import AppBaseModel


class RiskFactorContributionResponse(AppBaseModel):
    """A single factor's contribution to a zone's risk score."""

    name: str
    points: float
    weight: float
    detail: str


class ZoneRiskResultResponse(AppBaseModel):
    """Computed risk outcome for a single zone."""

    zone: str
    score: float
    risk_level: RiskLevel
    contributing_factors: list[RiskFactorContributionResponse]
    bullet_explanations: list[str]


class RiskScoreCalculationResultResponse(AppBaseModel):
    """Result payload for a single risk score engine run."""

    zone_count: int
    results: list[ZoneRiskResultResponse]
