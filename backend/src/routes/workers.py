"""
Worker management routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.worker import WorkerRepository
from src.schemas.worker import WorkerCreate, WorkerRead, WorkerUpdate
from src.utils.response import error_response, success_response

router: APIRouter = APIRouter(prefix="/workers", tags=["Workers"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    summary="List workers",
    description="Return a paginated list of all registered workers.",
    response_class=JSONResponse,
)
async def list_workers(
    db: DbDep,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum records to return"),
) -> JSONResponse:
    workers = WorkerRepository(db).get_all(skip=skip, limit=limit)
    return success_response(
        data=[WorkerRead.model_validate(w).model_dump(mode="json") for w in workers],
        message=f"{len(workers)} worker(s) retrieved.",
    )


@router.get(
    "/{worker_id}",
    summary="Get worker by ID",
    response_class=JSONResponse,
)
async def get_worker(worker_id: uuid.UUID, db: DbDep) -> JSONResponse:
    worker = WorkerRepository(db).get_by_id(worker_id)
    if worker is None:
        return error_response(message="Worker not found.", status_code=404)
    return success_response(data=WorkerRead.model_validate(worker).model_dump(mode="json"))


@router.post(
    "",
    summary="Create worker",
    status_code=status.HTTP_201_CREATED,
    response_class=JSONResponse,
)
async def create_worker(payload: WorkerCreate, db: DbDep) -> JSONResponse:
    worker = WorkerRepository(db).create(payload.model_dump())
    return success_response(
        data=WorkerRead.model_validate(worker).model_dump(mode="json"),
        message="Worker created.",
        status_code=status.HTTP_201_CREATED,
    )


@router.put(
    "/{worker_id}",
    summary="Update worker",
    response_class=JSONResponse,
)
async def update_worker(worker_id: uuid.UUID, payload: WorkerUpdate, db: DbDep) -> JSONResponse:
    updated = WorkerRepository(db).update(
        worker_id,
        payload.model_dump(exclude_unset=True),
    )
    if updated is None:
        return error_response(message="Worker not found.", status_code=404)
    return success_response(
        data=WorkerRead.model_validate(updated).model_dump(mode="json"),
        message="Worker updated.",
    )


@router.delete(
    "/{worker_id}",
    summary="Delete worker",
    response_class=JSONResponse,
)
async def delete_worker(worker_id: uuid.UUID, db: DbDep) -> JSONResponse:
    if not WorkerRepository(db).delete(worker_id):
        return error_response(message="Worker not found.", status_code=404)
    return success_response(message="Worker deleted.")
