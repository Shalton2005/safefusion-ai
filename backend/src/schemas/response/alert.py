"""Alert response models (Pydantic v2)."""

import uuid
from datetime import datetime

from src.validators.alert import AlertSchema


class AlertResponse(AlertSchema):
    """Response model for Alert resources."""

    id: uuid.UUID
    generated_at: datetime
    updated_at: datetime
