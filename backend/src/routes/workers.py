"""
Worker management routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
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
    description="Return a paginated list of all registered workers.",
    response_model=list[WorkerRead],
)
async def list_workers(
    service: WorkerServiceDep,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum records to return"),
) -> list[WorkerRead]:
    workers = service.list_workers(skip=skip, limit=limit)
    return [WorkerRead.model_validate(worker) for worker in workers]


@router.post(
    "",
    summary="Create worker",
    status_code=status.HTTP_201_CREATED,
    response_model=WorkerRead,
)
async def create_worker(payload: WorkerCreate, service: WorkerServiceDep) -> WorkerRead:
    worker = service.create_worker(payload.model_dump())
    return WorkerRead.model_validate(worker)


@router.put(
    "/{worker_id}",
    summary="Update worker",
    response_model=WorkerRead,
)
async def update_worker(
    worker_id: uuid.UUID,
    payload: WorkerUpdate,
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
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_worker(worker_id: uuid.UUID, service: WorkerServiceDep) -> Response:
    if not service.delete_worker(worker_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
