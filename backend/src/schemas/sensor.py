"""
Pydantic v2 schemas for the Sensor domain.
"""

import uuid
from datetime import datetime

from pydantic import Field

from src.models.enums import SensorStatus, SensorType
from src.schemas.base import AppBaseModel


class SensorBase(AppBaseModel):
    zone: str = Field(..., max_length=50, examples=["Zone-A"])
    sensor_type: SensorType = Field(..., examples=[SensorType.GAS])
    value: float = Field(..., examples=[42.5])
    unit: str = Field(..., max_length=20, examples=["ppm"])
    status: SensorStatus = SensorStatus.NORMAL


class SensorCreate(SensorBase):
    """Schema for ingesting a new sensor reading."""


class SensorRead(SensorBase):
    """Schema for returning a sensor reading (includes server-assigned fields)."""

    id: uuid.UUID
    timestamp: datetime
