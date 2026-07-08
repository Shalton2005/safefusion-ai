"""Pydantic schemas for the Worker domain (request/response/validation split)."""

from src.schemas.request.worker import WorkerCreateRequest, WorkerUpdateRequest
from src.schemas.response.worker import WorkerResponse
from src.validators.worker import WorkerSchema

# Backward-compatible aliases used by existing routes/services.
WorkerCreate = WorkerCreateRequest
WorkerUpdate = WorkerUpdateRequest
WorkerRead = WorkerResponse

__all__: list[str] = [
    "WorkerSchema",
    "WorkerCreateRequest",
    "WorkerUpdateRequest",
    "WorkerResponse",
    "WorkerCreate",
    "WorkerUpdate",
    "WorkerRead",
]
