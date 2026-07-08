"""Pydantic schemas for the MaintenanceLog domain (request/response/validation split)."""

from src.schemas.request.maintenance import MaintenanceLogCreateRequest, MaintenanceLogUpdateRequest
from src.schemas.response.maintenance import MaintenanceLogResponse
from src.validators.maintenance import MaintenanceLogSchema

# Backward-compatible aliases used by existing routes/services.
MaintenanceLogCreate = MaintenanceLogCreateRequest
MaintenanceLogUpdate = MaintenanceLogUpdateRequest
MaintenanceLogRead = MaintenanceLogResponse

__all__: list[str] = [
    "MaintenanceLogSchema",
    "MaintenanceLogCreateRequest",
    "MaintenanceLogUpdateRequest",
    "MaintenanceLogResponse",
    "MaintenanceLogCreate",
    "MaintenanceLogUpdate",
    "MaintenanceLogRead",
]
