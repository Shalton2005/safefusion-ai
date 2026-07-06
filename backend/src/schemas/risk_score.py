"""
Pydantic v2 schemas for the Risk Score domain.
"""

import uuid
from datetime import datetime

from pydantic import Field

from src.models.enums import RiskLevel
from src.schemas.base import AppBaseModel


class RiskScoreBase(AppBaseModel):
    zone: str = Field(..., max_length=50, examples=["Zone-A"])
    risk_score: float = Field(
        ..., ge=0.0, le=100.0, examples=[72.5], description="Compound risk score (0–100)"
    )
    risk_level: RiskLevel
    contributing_factors: str | None = Field(
        None, examples=["High gas reading, active hot-work permit, wet conditions."]
    )
    recommendation: str | None = Field(
        None, examples=["Halt hot-work operations and ventilate zone immediately."]
    )


class RiskScoreCreate(RiskScoreBase):
    """Schema for creating a new risk score record."""


class RiskScoreRead(RiskScoreBase):
    """Schema for returning a risk score (includes server-assigned fields)."""

    id: uuid.UUID
    analyzed_at: datetime
