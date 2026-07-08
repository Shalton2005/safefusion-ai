"""Worker response models (Pydantic v2)."""

import uuid
from datetime import datetime

from src.validators.worker import WorkerSchema


class WorkerResponse(WorkerSchema):
    """Response model for Worker resources."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
