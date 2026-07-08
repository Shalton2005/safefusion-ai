"""Sensor request models (Pydantic v2)."""

from src.validators.sensor import SensorSchema


class SensorCreateRequest(SensorSchema):
    """Request model for ingesting sensor data."""
