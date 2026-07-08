"""Incident response models (Pydantic v2)."""

import uuid
from datetime import datetime

from src.validators.incident import IncidentSchema


class IncidentResponse(IncidentSchema):
    """Response model for Incident resources."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
