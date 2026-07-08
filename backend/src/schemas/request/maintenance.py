"""MaintenanceLog request models (Pydantic v2)."""

from datetime import datetime

from pydantic import Field

from src.models.enums import MaintenanceStatus
from src.schemas.base import AppBaseModel
from src.validators.maintenance import MaintenanceLogSchema


class MaintenanceLogCreateRequest(MaintenanceLogSchema):
    """Request model for creating a maintenance log."""


class MaintenanceLogUpdateRequest(AppBaseModel):
    """Request model for partially updating a maintenance log."""

    status: MaintenanceStatus | None = None
    assigned_team: str | None = Field(None, min_length=2, max_length=100)
    start_time: datetime | None = None
    end_time: datetime | None = None
