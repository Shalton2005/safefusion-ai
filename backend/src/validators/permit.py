"""Validation models for Permit payloads."""

from datetime import datetime

from pydantic import Field, model_validator

from src.models.enums import PermitStatus, PermitType
from src.schemas.base import AppBaseModel


class PermitSchema(AppBaseModel):
    """Canonical validation model for Permit domain fields."""

    permit_type: PermitType = Field(..., examples=[PermitType.HOT_WORK])
    zone: str = Field(..., min_length=2, max_length=50, examples=["Zone-B"])
    issued_by: str = Field(..., min_length=2, max_length=100, examples=["Safety Officer Patel"])
    assigned_team: str = Field(..., min_length=2, max_length=100, examples=["Maintenance Team Alpha"])
    start_time: datetime = Field(..., examples=["2026-07-08T10:00:00Z"])
    end_time: datetime = Field(..., examples=["2026-07-08T16:00:00Z"])
    status: PermitStatus = Field(default=PermitStatus.ACTIVE, examples=[PermitStatus.ACTIVE])

    @model_validator(mode="after")
    def validate_time_window(self) -> "PermitSchema":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self
