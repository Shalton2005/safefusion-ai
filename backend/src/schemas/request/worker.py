"""Worker request models (Pydantic v2)."""

from pydantic import Field

from src.models.enums import WorkerStatus
from src.schemas.base import AppBaseModel
from src.validators.worker import WorkerSchema


class WorkerCreateRequest(WorkerSchema):
    """Request model for creating a worker."""


class WorkerUpdateRequest(AppBaseModel):
    """Request model for partially updating a worker."""

    name: str | None = Field(None, min_length=2, max_length=100)
    department: str | None = Field(None, min_length=2, max_length=100)
    role: str | None = Field(None, min_length=2, max_length=100)
    current_zone: str | None = Field(None, max_length=50)
    ppe_status: bool | None = None
    shift: str | None = Field(None, max_length=20)
    status: WorkerStatus | None = None
