"""Sensor response models (Pydantic v2)."""

import uuid
from datetime import datetime

from src.validators.sensor import SensorSchema


class SensorResponse(SensorSchema):
    """Response model for Sensor resources."""

    id: uuid.UUID
    timestamp: datetime
