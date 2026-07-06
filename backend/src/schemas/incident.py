"""
Pydantic v2 schemas for the Incident domain.
"""

import uuid
from datetime import datetime

from pydantic import Field

from src.models.enums import IncidentType, SeverityLevel
from src.schemas.base import AppBaseModel


class IncidentBase(AppBaseModel):
    zone: str = Field(..., max_length=50, examples=["Zone-C"])
    severity: SeverityLevel
    incident_type: IncidentType
    description: str = Field(..., examples=["Gas leak detected near compressor unit."])
    root_cause: str | None = Field(None, examples=["Worn gasket on pipe joint."])
    occurred_at: datetime


class IncidentCreate(IncidentBase):
    """Schema for creating a new incident record."""


class IncidentUpdate(AppBaseModel):
    """Schema for partial incident updates."""

    severity: SeverityLevel | None = None
    description: str | None = None
    root_cause: str | None = None


class IncidentRead(IncidentBase):
    """Schema for returning an incident record (includes server-assigned fields)."""

    id: uuid.UUID
    created_at: datetime
