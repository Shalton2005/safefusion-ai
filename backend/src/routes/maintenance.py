"""
Maintenance Log routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.maintenance import MaintenanceLogRepository
from src.schemas.maintenance import (
    MaintenanceLogCreate,
    MaintenanceLogRead,
    MaintenanceLogUpdate,
)
from src.services.event_bus import EventPublisher, EventSource, MaintenanceEventPublisherAdapter
from src.services.event_bus.bus import get_default_dispatcher
from src.services.maintenance import MaintenanceLogService

router: APIRouter = APIRouter(prefix="/maintenance", tags=["Maintenance"])

DbDep = Annotated[Session, Depends(get_db)]


def get_maintenance_service(db: DbDep) -> MaintenanceLogService:
    """Create a service instance with repository dependencies.

    Wires maintenance lifecycle hooks to the process-wide event bus — see
    ``get_sensor_service`` in ``src.routes.sensors`` for the equivalent
    wiring and rationale.
    """
    publisher = EventPublisher(get_default_dispatcher(), source=EventSource.MAINTENANCE)
    return MaintenanceLogService(
        repository=MaintenanceLogRepository(db),
        ai_pipeline=MaintenanceEventPublisherAdapter(publisher),
    )


MaintenanceServiceDep = Annotated[MaintenanceLogService, Depends(get_maintenance_service)]


@router.get(
    "",
    summary="List maintenance logs",
    description="Retrieve a paginated list of maintenance activity records for equipment across the plant.",
    response_model=list[MaintenanceLogRead],
    response_description="List of maintenance log records.",
)
def list_maintenance(
    service: MaintenanceServiceDep,
    skip: int = Query(0, ge=0, description="Number of maintenance logs to skip before returning results.", examples=[0]),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of maintenance logs to return.", examples=[100]),
) -> list[MaintenanceLogRead]:
    logs = service.list_logs(skip=skip, limit=limit)
    return [MaintenanceLogRead.model_validate(log) for log in logs]


@router.get(
    "/{log_id}",
    summary="Get maintenance log by ID",
    response_model=MaintenanceLogRead,
    response_description="Maintenance log record.",
)
def get_maintenance(
    log_id: Annotated[uuid.UUID, Path(description="Unique identifier of the maintenance log.")],
    service: MaintenanceServiceDep,
) -> MaintenanceLogRead:
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
    description="Create a new maintenance record for an equipment item, including schedule window, assigned team, and status.",
    status_code=status.HTTP_201_CREATED,
    response_model=MaintenanceLogRead,
    response_description="Created maintenance log record.",
)
def create_maintenance(
    payload: Annotated[
        MaintenanceLogCreate,
        Body(
            openapi_examples={
                "default": {
                    "summary": "Create maintenance log example",
                    "value": {
                        "equipment_id": "EQ-0042",
                        "equipment_name": "Compressor Unit 3",
                        "maintenance_type": "preventive",
                        "assigned_team": "Mechanical Team Bravo",
                        "status": "planned",
                        "start_time": "2026-07-08T09:00:00Z",
                        "end_time": "2026-07-08T12:00:00Z",
                    },
                }
            }
        ),
    ],
    service: MaintenanceServiceDep,
) -> MaintenanceLogRead:
    log = service.create_log(payload.model_dump())
    return MaintenanceLogRead.model_validate(log)


@router.put(
    "/{log_id}",
    summary="Update a maintenance log entry",
    response_model=MaintenanceLogRead,
    response_description="Updated maintenance log record.",
)
def update_maintenance(
    log_id: Annotated[uuid.UUID, Path(description="Unique identifier of the maintenance log.")],
    payload: Annotated[
        MaintenanceLogUpdate,
        Body(
            openapi_examples={
                "status-change": {
                    "summary": "Update maintenance log status",
                    "value": {"status": "ongoing", "assigned_team": "Mechanical Team Bravo"},
                }
            }
        ),
    ],
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
    description="Delete a maintenance log record by its unique identifier.",
    status_code=status.HTTP_204_NO_CONTENT,
    response_description="Maintenance log deleted successfully.",
)
def delete_maintenance(
    log_id: Annotated[uuid.UUID, Path(description="Unique identifier of the maintenance log.")],
    service: MaintenanceServiceDep,
) -> Response:
    if not service.delete_log(log_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance log not found.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
