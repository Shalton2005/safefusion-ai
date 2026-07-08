"""Validation models for RiskScore payloads."""

from pydantic import Field

from src.models.enums import RiskLevel
from src.schemas.base import AppBaseModel


class RiskScoreSchema(AppBaseModel):
    """Canonical validation model for RiskAssessment (risk score) fields."""

    zone: str = Field(..., min_length=2, max_length=50, examples=["Zone-A"])
    risk_score: float = Field(..., ge=0.0, le=100.0, examples=[72.5])
    risk_level: RiskLevel = Field(..., examples=[RiskLevel.HIGH])
    contributing_factors: str | None = Field(
        None,
        max_length=4000,
        examples=["High gas reading, active hot-work permit, wet conditions."],
    )
    recommendation: str | None = Field(
        None,
        max_length=4000,
        examples=["Halt hot-work operations and ventilate zone immediately."],
    )
