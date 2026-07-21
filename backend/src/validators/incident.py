"""Validation models for Incident payloads."""

from datetime import datetime

from pydantic import Field

from src.models.enums import IncidentType, SeverityLevel
from src.schemas.base import AppBaseModel


class IncidentSchema(AppBaseModel):
    """Canonical validation model for Incident domain fields."""

    zone: str = Field(..., min_length=2, max_length=50, examples=["Substation"])
    severity: SeverityLevel = Field(..., examples=[SeverityLevel.HIGH])
    incident_type: IncidentType = Field(..., examples=[IncidentType.GAS_LEAK])
    description: str = Field(..., min_length=10, max_length=4000, examples=["Gas leak detected near compressor unit."])
    root_cause: str | None = Field(None, max_length=4000, examples=["Worn gasket on pipe joint."])
    occurred_at: datetime = Field(..., examples=["2026-07-08T09:45:00Z"])
