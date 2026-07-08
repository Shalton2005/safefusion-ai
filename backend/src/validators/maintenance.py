"""Validation models for MaintenanceLog payloads."""

from datetime import datetime

from pydantic import Field

from src.models.enums import MaintenanceStatus, MaintenanceType
from src.schemas.base import AppBaseModel


class MaintenanceLogSchema(AppBaseModel):
    """Canonical validation model for MaintenanceLog domain fields."""

    equipment_id: str = Field(..., min_length=2, max_length=50, examples=["EQ-0042"])
    equipment_name: str = Field(..., min_length=2, max_length=100, examples=["Compressor Unit 3"])
    maintenance_type: MaintenanceType = Field(..., examples=[MaintenanceType.PREVENTIVE])
    assigned_team: str = Field(..., min_length=2, max_length=100, examples=["Mechanical Team Bravo"])
    status: MaintenanceStatus = Field(default=MaintenanceStatus.PLANNED, examples=[MaintenanceStatus.PLANNED])
    start_time: datetime | None = Field(None, examples=["2026-07-08T09:00:00Z"])
    end_time: datetime | None = Field(None, examples=["2026-07-08T12:00:00Z"])
