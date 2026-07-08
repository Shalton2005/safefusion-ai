"""Validation models for Sensor payloads."""

from math import isfinite

from pydantic import Field, field_validator

from src.models.enums import SensorStatus, SensorType
from src.schemas.base import AppBaseModel


class SensorSchema(AppBaseModel):
    """Canonical validation model for Sensor domain fields."""

    zone: str = Field(..., min_length=2, max_length=50, examples=["Zone-A"])
    sensor_type: SensorType = Field(..., examples=[SensorType.GAS])
    value: float = Field(..., examples=[42.5])
    unit: str = Field(..., min_length=1, max_length=20, examples=["ppm"])
    status: SensorStatus = Field(default=SensorStatus.NORMAL, examples=[SensorStatus.NORMAL])

    @field_validator("value")
    @classmethod
    def validate_value(cls, value: float) -> float:
        if not isfinite(value):
            raise ValueError("value must be a finite number")
        return value
