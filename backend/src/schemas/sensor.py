"""Pydantic schemas for the Sensor domain (request/response/validation split)."""

from src.schemas.request.sensor import SensorCreateRequest
from src.schemas.response.sensor import SensorResponse
from src.validators.sensor import SensorSchema

# Backward-compatible aliases used by existing routes/services.
SensorCreate = SensorCreateRequest
SensorRead = SensorResponse

__all__: list[str] = [
    "SensorSchema",
    "SensorCreateRequest",
    "SensorResponse",
    "SensorCreate",
    "SensorRead",
]
