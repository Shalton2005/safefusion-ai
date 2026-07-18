"""Response schemas for the Compound Risk Detection service."""

from typing import Any

from src.models.enums import RiskLevel
from src.schemas.base import AppBaseModel


class CompoundRiskRuleMatchResponse(AppBaseModel):
    """A single compound rule that triggered for a zone."""

    rule_name: str
    points: float
    explanation: str
    evidence: dict[str, Any] = {}
    confidence: float = 1.0


class ZoneCompoundRiskResultResponse(AppBaseModel):
    """Computed compound risk outcome for a single zone."""

    zone: str
    risk_score: float
    risk_level: RiskLevel
    triggered_rules: list[CompoundRiskRuleMatchResponse]
    explanation: str
    bullet_explanations: list[str]
    evidence: dict[str, Any] = {}
    confidence: float = 1.0


class CompoundRiskDetectionResultResponse(AppBaseModel):
    """Result payload for a single compound risk detection run."""

    zone_count: int
    results: list[ZoneCompoundRiskResultResponse]
