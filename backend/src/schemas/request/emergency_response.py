"""Request schemas for the Emergency Response service."""

from pydantic import Field

from src.models.enums import RiskLevel
from src.schemas.base import AppBaseModel


class CompoundRiskRuleMatchRequest(AppBaseModel):
    """A single compound rule match, as produced by the Compound Risk Engine."""

    rule_name: str
    points: float
    explanation: str


class ZoneCompoundRiskResultRequest(AppBaseModel):
    """Compound Risk Engine output for a single zone.

    Mirrors ``src.services.compound_risk.schemas.ZoneCompoundRiskResult`` so
    callers can submit compound risk results directly (e.g. from a prior
    ``/monitoring/compound-risk`` run) for emergency response evaluation.
    """

    zone: str = Field(..., min_length=2, max_length=50, examples=["Distillation-Unit"])
    risk_score: float = Field(..., ge=0.0, le=100.0, examples=[82.5])
    risk_level: RiskLevel = Field(..., examples=[RiskLevel.CRITICAL])
    triggered_rules: list[CompoundRiskRuleMatchRequest] = Field(default_factory=list)


class EmergencyResponseRequest(AppBaseModel):
    """Request payload for the emergency response engine."""

    zone_results: list[ZoneCompoundRiskResultRequest] = Field(..., min_length=1)
