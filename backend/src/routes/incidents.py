"""
Incident routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, Response, status
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
    description="Retrieve a paginated list of historical and simulated safety incident records.",
    response_model=list[IncidentRead],
    response_description="List of incident records.",
)
async def list_incidents(
    service: IncidentServiceDep,
    skip: int = Query(0, ge=0, description="Number of incident records to skip before returning results.", examples=[0]),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of incident records to return.", examples=[100]),
) -> list[IncidentRead]:
    incidents = service.list_incidents(skip=skip, limit=limit)
    return [IncidentRead.model_validate(incident) for incident in incidents]


@router.get(
    "/{incident_id}",
    summary="Get incident by ID",
    response_model=IncidentRead,
    response_description="Incident record.",
)
async def get_incident(
    incident_id: Annotated[uuid.UUID, Path(description="Unique identifier of the incident.")],
    service: IncidentServiceDep,
) -> IncidentRead:
    incident = service.get_incident_by_id(incident_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return IncidentRead.model_validate(incident)


@router.post(
    "",
    summary="Create an incident report",
    description="Create a new incident record with severity, type, narrative, and occurrence timestamp.",
    status_code=status.HTTP_201_CREATED,
    response_model=IncidentRead,
    response_description="Created incident record.",
)
async def create_incident(
    payload: Annotated[
        IncidentCreate,
        Body(
            openapi_examples={
                "default": {
                    "summary": "Create incident example",
                    "value": {
                        "zone": "Zone-C",
                        "severity": "high",
                        "incident_type": "gas_leak",
                        "description": "Gas leak detected near compressor unit.",
                        "root_cause": "Worn gasket on pipe joint.",
                        "occurred_at": "2026-07-08T09:45:00Z",
                    },
                }
            }
        ),
    ],
    service: IncidentServiceDep,
) -> IncidentRead:
    incident = service.create_incident(payload.model_dump())
    return IncidentRead.model_validate(incident)


@router.put(
    "/{incident_id}",
    summary="Update an incident record",
    response_model=IncidentRead,
    response_description="Updated incident record.",
)
async def update_incident(
    incident_id: Annotated[uuid.UUID, Path(description="Unique identifier of the incident.")],
    payload: Annotated[
        IncidentUpdate,
        Body(
            openapi_examples={
                "severity-update": {
                    "summary": "Update incident severity",
                    "value": {"severity": "critical", "root_cause": "Valve seal rupture confirmed."},
                }
            }
        ),
    ],
    service: IncidentServiceDep,
) -> IncidentRead:
    updated = service.update_incident(incident_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return IncidentRead.model_validate(updated)


@router.delete(
    "/{incident_id}",
    summary="Delete an incident record",
    description="Delete an incident record by its unique identifier.",
    status_code=status.HTTP_204_NO_CONTENT,
    response_description="Incident record deleted successfully.",
)
async def delete_incident(
    incident_id: Annotated[uuid.UUID, Path(description="Unique identifier of the incident.")],
    service: IncidentServiceDep,
) -> Response:
    if not service.delete_incident(incident_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
