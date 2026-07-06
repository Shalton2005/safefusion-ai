"""
Pydantic v2 schemas for the Alert domain.
"""

import uuid
from datetime import datetime

from pydantic import Field

from src.models.enums import AlertStatus, AlertType
from src.schemas.base import AppBaseModel


class AlertBase(AppBaseModel):
    zone: str = Field(..., max_length=50, examples=["Zone-A"])
    alert_type: AlertType
    message: str = Field(..., examples=["Gas concentration exceeds safe threshold."])
    generated_by: str = Field("AI Engine", max_length=50)
    status: AlertStatus = AlertStatus.ACTIVE


class AlertCreate(AlertBase):
    """Schema for creating a new alert."""


class AlertUpdate(AppBaseModel):
    """Schema for partial alert updates."""

    status: AlertStatus | None = None
    message: str | None = None


class AlertRead(AlertBase):
    """Schema for returning an alert (includes server-assigned fields)."""

    id: uuid.UUID
    generated_at: datetime
