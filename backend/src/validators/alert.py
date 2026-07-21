"""Validation models for Alert payloads."""

from pydantic import Field

from src.models.enums import AlertSeverity, AlertSource, AlertStatus, AlertType
from src.schemas.base import AppBaseModel


class AlertSchema(AppBaseModel):
    """Canonical validation model for Alert domain fields."""

    zone: str = Field(..., min_length=2, max_length=50, examples=["Distillation-Unit"])
    alert_type: AlertType = Field(..., examples=[AlertType.CRITICAL])
    severity: AlertSeverity = Field(default=AlertSeverity.MEDIUM, examples=[AlertSeverity.CRITICAL])
    source: AlertSource = Field(default=AlertSource.SENSOR_MONITORING, examples=[AlertSource.SENSOR_MONITORING])
    message: str = Field(..., min_length=10, max_length=1000, examples=["Gas concentration exceeds safe threshold."])
    generated_by: str = Field(default="AI Engine", max_length=50, examples=["AI Engine"])
    status: AlertStatus = Field(default=AlertStatus.ACTIVE, examples=[AlertStatus.ACTIVE])
