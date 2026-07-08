"""RiskScore request models (Pydantic v2)."""

from pydantic import Field

from src.models.enums import RiskLevel
from src.schemas.base import AppBaseModel
from src.validators.risk_score import RiskScoreSchema


class RiskScoreCreateRequest(RiskScoreSchema):
    """Request model for creating a risk score."""


class RiskScoreUpdateRequest(AppBaseModel):
    """Request model for partially updating a risk score."""

    zone: str | None = Field(None, min_length=2, max_length=50)
    risk_score: float | None = Field(None, ge=0.0, le=100.0)
    risk_level: RiskLevel | None = None
    contributing_factors: str | None = Field(None, max_length=4000)
    recommendation: str | None = Field(None, max_length=4000)
