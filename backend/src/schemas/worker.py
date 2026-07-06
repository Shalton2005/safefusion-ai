"""
Pydantic v2 schemas for the Worker domain.
"""

import uuid
from datetime import datetime

from pydantic import Field

from src.models.enums import WorkerStatus
from src.schemas.base import AppBaseModel


class WorkerBase(AppBaseModel):
    name: str = Field(..., max_length=100, examples=["John Smith"])
    employee_id: str = Field(..., max_length=50, examples=["EMP-001"])
    department: str = Field(..., max_length=100, examples=["Operations"])
    role: str = Field(..., max_length=100, examples=["Process Technician"])
    current_zone: str | None = Field(None, max_length=50, examples=["Zone-A"])
    ppe_status: bool = Field(False, description="True when worker is PPE-compliant")
    shift: str = Field(..., max_length=20, examples=["Morning"])
    status: WorkerStatus = WorkerStatus.WORKING


class WorkerCreate(WorkerBase):
    """Schema for creating a new worker record."""


class WorkerUpdate(AppBaseModel):
    """Schema for partial worker updates. All fields are optional."""

    name: str | None = Field(None, max_length=100)
    department: str | None = Field(None, max_length=100)
    role: str | None = Field(None, max_length=100)
    current_zone: str | None = Field(None, max_length=50)
    ppe_status: bool | None = None
    shift: str | None = Field(None, max_length=20)
    status: WorkerStatus | None = None


class WorkerRead(WorkerBase):
    """Schema for reading a worker record (includes server-assigned fields)."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
