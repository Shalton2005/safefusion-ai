"""
Pydantic v2 schemas for the Permit-to-Work domain.
"""

import uuid
from datetime import datetime

from pydantic import Field, model_validator

from src.models.enums import PermitStatus, PermitType
from src.schemas.base import AppBaseModel


class PermitBase(AppBaseModel):
    permit_type: PermitType
    zone: str = Field(..., max_length=50, examples=["Zone-B"])
    issued_by: str = Field(..., max_length=100, examples=["Safety Officer Patel"])
    assigned_team: str = Field(..., max_length=100, examples=["Maintenance Team Alpha"])
    start_time: datetime
    end_time: datetime
    status: PermitStatus = PermitStatus.ACTIVE

    @model_validator(mode="after")
    def _end_after_start(self) -> "PermitBase":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class PermitCreate(PermitBase):
    """Schema for issuing a new Permit-to-Work."""


class PermitUpdate(AppBaseModel):
    """Schema for partial permit updates."""

    status: PermitStatus | None = None
    end_time: datetime | None = None
    assigned_team: str | None = Field(None, max_length=100)


class PermitRead(PermitBase):
    """Schema for returning a permit record (includes server-assigned fields)."""

    id: uuid.UUID
    created_at: datetime
