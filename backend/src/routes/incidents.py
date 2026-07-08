"""
Incident routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.incident import IncidentRepository
from src.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate
from src.services.incident import IncidentService

router: APIRouter = APIRouter(prefix="/incidents", tags=["Incidents"])

DbDep = Annotated[Session, Depends(get_db)]


def get_incident_service(db: DbDep) -> IncidentService:
    """Create a service instance with repository dependencies."""
    return IncidentService(repository=IncidentRepository(db))


IncidentServiceDep = Annotated[IncidentService, Depends(get_incident_service)]


@router.get(
    "",
    summary="List incidents",
    description="Return a paginated list of historical and simulated incident records.",
    response_model=list[IncidentRead],
)
async def list_incidents(
    service: IncidentServiceDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[IncidentRead]:
    incidents = service.list_incidents(skip=skip, limit=limit)
    return [IncidentRead.model_validate(incident) for incident in incidents]


@router.get(
    "/{incident_id}",
    summary="Get incident by ID",
    response_model=IncidentRead,
)
async def get_incident(incident_id: uuid.UUID, service: IncidentServiceDep) -> IncidentRead:
    incident = service.get_incident_by_id(incident_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return IncidentRead.model_validate(incident)


@router.post(
    "",
    summary="Create an incident report",
    status_code=status.HTTP_201_CREATED,
    response_model=IncidentRead,
)
async def create_incident(payload: IncidentCreate, service: IncidentServiceDep) -> IncidentRead:
    incident = service.create_incident(payload.model_dump())
    return IncidentRead.model_validate(incident)


@router.put(
    "/{incident_id}",
    summary="Update an incident record",
    response_model=IncidentRead,
)
async def update_incident(
    incident_id: uuid.UUID,
    payload: IncidentUpdate,
    service: IncidentServiceDep,
) -> IncidentRead:
    updated = service.update_incident(incident_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return IncidentRead.model_validate(updated)


@router.delete(
    "/{incident_id}",
    summary="Delete an incident record",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_incident(incident_id: uuid.UUID, service: IncidentServiceDep) -> Response:
    if not service.delete_incident(incident_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
