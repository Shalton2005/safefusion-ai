"""
Maintenance Log routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.maintenance import MaintenanceLogRepository
from src.schemas.maintenance import (
    MaintenanceLogCreate,
    MaintenanceLogRead,
    MaintenanceLogUpdate,
)
from src.services.maintenance import MaintenanceLogService

router: APIRouter = APIRouter(prefix="/maintenance", tags=["Maintenance"])

DbDep = Annotated[Session, Depends(get_db)]


def get_maintenance_service(db: DbDep) -> MaintenanceLogService:
    """Create a service instance with repository dependencies."""
    return MaintenanceLogService(repository=MaintenanceLogRepository(db))


MaintenanceServiceDep = Annotated[MaintenanceLogService, Depends(get_maintenance_service)]


@router.get(
    "",
    summary="List maintenance logs",
    description="Return a paginated list of all maintenance log entries.",
    response_model=list[MaintenanceLogRead],
)
async def list_maintenance(
    service: MaintenanceServiceDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[MaintenanceLogRead]:
    logs = service.list_logs(skip=skip, limit=limit)
    return [MaintenanceLogRead.model_validate(log) for log in logs]


@router.get(
    "/{log_id}",
    summary="Get maintenance log by ID",
    response_model=MaintenanceLogRead,
)
async def get_maintenance(log_id: uuid.UUID, service: MaintenanceServiceDep) -> MaintenanceLogRead:
    log = service.get_log_by_id(log_id)
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance log not found.",
        )
    return MaintenanceLogRead.model_validate(log)


@router.post(
    "",
    summary="Create a maintenance log entry",
    status_code=status.HTTP_201_CREATED,
    response_model=MaintenanceLogRead,
)
async def create_maintenance(
    payload: MaintenanceLogCreate,
    service: MaintenanceServiceDep,
) -> MaintenanceLogRead:
    log = service.create_log(payload.model_dump())
    return MaintenanceLogRead.model_validate(log)


@router.put(
    "/{log_id}",
    summary="Update a maintenance log entry",
    response_model=MaintenanceLogRead,
)
async def update_maintenance(
    log_id: uuid.UUID,
    payload: MaintenanceLogUpdate,
    service: MaintenanceServiceDep,
) -> MaintenanceLogRead:
    updated = service.update_log(log_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance log not found.",
        )
    return MaintenanceLogRead.model_validate(updated)


@router.delete(
    "/{log_id}",
    summary="Delete a maintenance log entry",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_maintenance(log_id: uuid.UUID, service: MaintenanceServiceDep) -> Response:
    if not service.delete_log(log_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance log not found.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
