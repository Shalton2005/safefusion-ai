"""
Incident routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.incident import IncidentRepository
from src.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate
from src.utils.response import error_response, success_response

router: APIRouter = APIRouter(prefix="/incidents", tags=["Incidents"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    summary="List incidents",
    description="Return a paginated list of historical and simulated incident records.",
    response_class=JSONResponse,
)
async def list_incidents(
    db: DbDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> JSONResponse:
    incidents = IncidentRepository(db).get_all(skip=skip, limit=limit)
    return success_response(
        data=[IncidentRead.model_validate(i).model_dump(mode="json") for i in incidents],
        message=f"{len(incidents)} incident(s) retrieved.",
    )


@router.get(
    "/{incident_id}",
    summary="Get incident by ID",
    response_class=JSONResponse,
)
async def get_incident(incident_id: uuid.UUID, db: DbDep) -> JSONResponse:
    incident = IncidentRepository(db).get_by_id(incident_id)
    if incident is None:
        return error_response(message="Incident not found.", status_code=404)
    return success_response(data=IncidentRead.model_validate(incident).model_dump(mode="json"))


@router.post(
    "",
    summary="Create an incident report",
    status_code=status.HTTP_201_CREATED,
    response_class=JSONResponse,
)
async def create_incident(payload: IncidentCreate, db: DbDep) -> JSONResponse:
    incident = IncidentRepository(db).create(payload.model_dump())
    return success_response(
        data=IncidentRead.model_validate(incident).model_dump(mode="json"),
        message="Incident recorded.",
        status_code=status.HTTP_201_CREATED,
    )


@router.put(
    "/{incident_id}",
    summary="Update an incident record",
    response_class=JSONResponse,
)
async def update_incident(
    incident_id: uuid.UUID, payload: IncidentUpdate, db: DbDep
) -> JSONResponse:
    updated = IncidentRepository(db).update(incident_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        return error_response(message="Incident not found.", status_code=404)
    return success_response(
        data=IncidentRead.model_validate(updated).model_dump(mode="json"),
        message="Incident updated.",
    )
