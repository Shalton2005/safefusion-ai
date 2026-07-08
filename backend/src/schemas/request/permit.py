"""Permit request models (Pydantic v2)."""

from datetime import datetime

from pydantic import Field

from src.models.enums import PermitStatus
from src.schemas.base import AppBaseModel
from src.validators.permit import PermitSchema


class PermitCreateRequest(PermitSchema):
    """Request model for creating a permit."""


class PermitUpdateRequest(AppBaseModel):
    """Request model for partially updating a permit."""

    status: PermitStatus | None = None
    end_time: datetime | None = None
    assigned_team: str | None = Field(None, min_length=2, max_length=100)
