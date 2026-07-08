"""Permit response models (Pydantic v2)."""

import uuid
from datetime import datetime

from src.validators.permit import PermitSchema


class PermitResponse(PermitSchema):
    """Response model for Permit resources."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
