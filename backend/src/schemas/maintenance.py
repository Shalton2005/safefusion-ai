"""
Pydantic v2 schemas for the Maintenance Log domain.
"""

import uuid
from datetime import datetime

from pydantic import Field

from src.models.enums import MaintenanceStatus, MaintenanceType
from src.schemas.base import AppBaseModel


class MaintenanceLogBase(AppBaseModel):
    equipment_id: str = Field(..., max_length=50, examples=["EQ-0042"])
    equipment_name: str = Field(..., max_length=100, examples=["Compressor Unit 3"])
    maintenance_type: MaintenanceType
    assigned_team: str = Field(..., max_length=100, examples=["Mechanical Team Bravo"])
    status: MaintenanceStatus = MaintenanceStatus.PLANNED
    start_time: datetime | None = None
    end_time: datetime | None = None


class MaintenanceLogCreate(MaintenanceLogBase):
    """Schema for creating a new maintenance log entry."""


class MaintenanceLogUpdate(AppBaseModel):
    """Schema for partial maintenance log updates."""

    status: MaintenanceStatus | None = None
    assigned_team: str | None = Field(None, max_length=100)
    start_time: datetime | None = None
    end_time: datetime | None = None


class MaintenanceLogRead(MaintenanceLogBase):
    """Schema for returning a maintenance log (includes server-assigned fields)."""

    id: uuid.UUID
    created_at: datetime
