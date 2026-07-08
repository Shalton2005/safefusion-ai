"""Pydantic schemas for the Alert domain (request/response/validation split)."""

from src.schemas.request.alert import AlertCreateRequest, AlertUpdateRequest
from src.schemas.response.alert import AlertResponse
from src.validators.alert import AlertSchema

# Backward-compatible aliases used by existing routes/services.
AlertCreate = AlertCreateRequest
AlertUpdate = AlertUpdateRequest
AlertRead = AlertResponse

__all__: list[str] = [
    "AlertSchema",
    "AlertCreateRequest",
    "AlertUpdateRequest",
    "AlertResponse",
    "AlertCreate",
    "AlertUpdate",
    "AlertRead",
]
