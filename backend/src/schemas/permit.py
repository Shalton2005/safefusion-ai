"""Pydantic schemas for the Permit domain (request/response/validation split)."""

from src.schemas.request.permit import PermitCreateRequest, PermitUpdateRequest
from src.schemas.response.permit import PermitResponse
from src.validators.permit import PermitSchema

# Backward-compatible aliases used by existing routes/services.
PermitCreate = PermitCreateRequest
PermitUpdate = PermitUpdateRequest
PermitRead = PermitResponse

__all__: list[str] = [
    "PermitSchema",
    "PermitCreateRequest",
    "PermitUpdateRequest",
    "PermitResponse",
    "PermitCreate",
    "PermitUpdate",
    "PermitRead",
]
