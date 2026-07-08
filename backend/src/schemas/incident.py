"""Pydantic schemas for the Incident domain (request/response/validation split)."""

from src.schemas.request.incident import IncidentCreateRequest, IncidentUpdateRequest
from src.schemas.response.incident import IncidentResponse
from src.validators.incident import IncidentSchema

# Backward-compatible aliases used by existing routes/services.
IncidentCreate = IncidentCreateRequest
IncidentUpdate = IncidentUpdateRequest
IncidentRead = IncidentResponse

__all__: list[str] = [
    "IncidentSchema",
    "IncidentCreateRequest",
    "IncidentUpdateRequest",
    "IncidentResponse",
    "IncidentCreate",
    "IncidentUpdate",
    "IncidentRead",
]
