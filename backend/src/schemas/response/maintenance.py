"""MaintenanceLog response models (Pydantic v2)."""

import uuid
from datetime import datetime

from src.validators.maintenance import MaintenanceLogSchema


class MaintenanceLogResponse(MaintenanceLogSchema):
    """Response model for MaintenanceLog resources."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
