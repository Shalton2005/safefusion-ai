"""Validation models for Alert payloads."""

from pydantic import Field

from src.models.enums import AlertStatus, AlertType
from src.schemas.base import AppBaseModel


class AlertSchema(AppBaseModel):
    """Canonical validation model for Alert domain fields."""

    zone: str = Field(..., min_length=2, max_length=50, examples=["Zone-A"])
    alert_type: AlertType = Field(..., examples=[AlertType.CRITICAL])
    message: str = Field(..., min_length=10, max_length=1000, examples=["Gas concentration exceeds safe threshold."])
    generated_by: str = Field(default="AI Engine", max_length=50, examples=["AI Engine"])
    status: AlertStatus = Field(default=AlertStatus.ACTIVE, examples=[AlertStatus.ACTIVE])
