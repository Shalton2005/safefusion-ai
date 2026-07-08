"""Incident request models (Pydantic v2)."""

from pydantic import Field

from src.models.enums import SeverityLevel
from src.schemas.base import AppBaseModel
from src.validators.incident import IncidentSchema


class IncidentCreateRequest(IncidentSchema):
    """Request model for creating an incident."""


class IncidentUpdateRequest(AppBaseModel):
    """Request model for partially updating an incident."""

    severity: SeverityLevel | None = None
    description: str | None = Field(None, min_length=10, max_length=4000)
    root_cause: str | None = Field(None, max_length=4000)
