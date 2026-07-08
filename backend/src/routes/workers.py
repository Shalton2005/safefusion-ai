"""
Worker management routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.worker import WorkerRepository
from src.schemas.worker import WorkerCreate, WorkerRead, WorkerUpdate
from src.services.worker import WorkerService

router: APIRouter = APIRouter(prefix="/workers", tags=["Workers"])

DbDep = Annotated[Session, Depends(get_db)]


def get_worker_service(db: DbDep) -> WorkerService:
    """Create a service instance with repository dependencies."""
    return WorkerService(repository=WorkerRepository(db))


WorkerServiceDep = Annotated[WorkerService, Depends(get_worker_service)]


@router.get(
    "",
    summary="List workers",
    description="Retrieve a paginated list of registered workers with their current operational status and zone assignment.",
    response_model=list[WorkerRead],
    response_description="List of worker records.",
)
def list_workers(
    service: WorkerServiceDep,
    skip: int = Query(0, ge=0, description="Number of worker records to skip before returning results.", examples=[0]),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of worker records to return.", examples=[100]),
) -> list[WorkerRead]:
    workers = service.list_workers(skip=skip, limit=limit)
    return [WorkerRead.model_validate(worker) for worker in workers]


@router.post(
    "",
    summary="Create worker",
    description="Register a new worker in the system with personnel, shift, and current zone details.",
    status_code=status.HTTP_201_CREATED,
    response_model=WorkerRead,
    response_description="Created worker record.",
)
def create_worker(
    payload: Annotated[
        WorkerCreate,
        Body(
            openapi_examples={
                "default": {
                    "summary": "Create worker example",
                    "value": {
                        "name": "Aarav Sharma",
                        "employee_id": "EMP-0001",
                        "department": "Operations",
                        "role": "Process Technician",
                        "current_zone": "Zone-A",
                        "ppe_status": True,
                        "shift": "Morning",
                        "status": "working",
                    },
                }
            }
        ),
    ],
    service: WorkerServiceDep,
) -> WorkerRead:
    worker = service.create_worker(payload.model_dump())
    return WorkerRead.model_validate(worker)


@router.put(
    "/{worker_id}",
    summary="Update worker",
    description="Update one or more mutable worker fields for an existing worker record.",
    response_model=WorkerRead,
    response_description="Updated worker record.",
)
def update_worker(
    worker_id: Annotated[uuid.UUID, Path(description="Unique identifier of the worker.")],
    payload: Annotated[
        WorkerUpdate,
        Body(
            openapi_examples={
                "status-change": {
                    "summary": "Update worker status",
                    "value": {"current_zone": "Boiler-Area", "status": "idle"},
                }
            }
        ),
    ],
    service: WorkerServiceDep,
) -> WorkerRead:
    updated = service.update_worker(
        worker_id,
        payload.model_dump(exclude_unset=True),
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found.")
    return WorkerRead.model_validate(updated)


@router.delete(
    "/{worker_id}",
    summary="Delete worker",
    description="Delete an existing worker record by its unique identifier.",
    status_code=status.HTTP_204_NO_CONTENT,
    response_description="Worker deleted successfully.",
)
def delete_worker(
    worker_id: Annotated[uuid.UUID, Path(description="Unique identifier of the worker.")],
    service: WorkerServiceDep,
) -> Response:
    if not service.delete_worker(worker_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
