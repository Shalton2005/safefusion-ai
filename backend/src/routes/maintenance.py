"""
Maintenance Log routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.maintenance import MaintenanceLogRepository
from src.schemas.maintenance import (
    MaintenanceLogCreate,
    MaintenanceLogRead,
    MaintenanceLogUpdate,
)
from src.utils.response import error_response, success_response

router: APIRouter = APIRouter(prefix="/maintenance", tags=["Maintenance"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    summary="List maintenance logs",
    description="Return a paginated list of all maintenance log entries.",
    response_class=JSONResponse,
)
async def list_maintenance(
    db: DbDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> JSONResponse:
    logs = MaintenanceLogRepository(db).get_all(skip=skip, limit=limit)
    return success_response(
        data=[MaintenanceLogRead.model_validate(log).model_dump(mode="json") for log in logs],
        message=f"{len(logs)} maintenance log(s) retrieved.",
    )


@router.get(
    "/{log_id}",
    summary="Get maintenance log by ID",
    response_class=JSONResponse,
)
async def get_maintenance(log_id: uuid.UUID, db: DbDep) -> JSONResponse:
    log = MaintenanceLogRepository(db).get_by_id(log_id)
    if log is None:
        return error_response(message="Maintenance log not found.", status_code=404)
    return success_response(data=MaintenanceLogRead.model_validate(log).model_dump(mode="json"))


@router.post(
    "",
    summary="Create a maintenance log entry",
    status_code=status.HTTP_201_CREATED,
    response_class=JSONResponse,
)
async def create_maintenance(payload: MaintenanceLogCreate, db: DbDep) -> JSONResponse:
    log = MaintenanceLogRepository(db).create(payload.model_dump())
    return success_response(
        data=MaintenanceLogRead.model_validate(log).model_dump(mode="json"),
        message="Maintenance log created.",
        status_code=status.HTTP_201_CREATED,
    )


@router.put(
    "/{log_id}",
    summary="Update a maintenance log entry",
    response_class=JSONResponse,
)
async def update_maintenance(
    log_id: uuid.UUID, payload: MaintenanceLogUpdate, db: DbDep
) -> JSONResponse:
    updated = MaintenanceLogRepository(db).update(log_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        return error_response(message="Maintenance log not found.", status_code=404)
    return success_response(
        data=MaintenanceLogRead.model_validate(updated).model_dump(mode="json"),
        message="Maintenance log updated.",
    )
