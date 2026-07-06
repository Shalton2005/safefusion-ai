"""
Alert routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.alert import AlertRepository
from src.schemas.alert import AlertCreate, AlertRead, AlertUpdate
from src.utils.response import error_response, success_response

router: APIRouter = APIRouter(prefix="/alerts", tags=["Alerts"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    summary="List alerts",
    description="Return a paginated list of all safety alerts.",
    response_class=JSONResponse,
)
async def list_alerts(
    db: DbDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    active_only: bool = Query(False, description="When true, return only active alerts"),
) -> JSONResponse:
    repo = AlertRepository(db)
    alerts = repo.get_active() if active_only else repo.get_all(skip=skip, limit=limit)
    return success_response(
        data=[AlertRead.model_validate(a).model_dump(mode="json") for a in alerts],
        message=f"{len(alerts)} alert(s) retrieved.",
    )


@router.get(
    "/{alert_id}",
    summary="Get alert by ID",
    response_class=JSONResponse,
)
async def get_alert(alert_id: uuid.UUID, db: DbDep) -> JSONResponse:
    alert = AlertRepository(db).get_by_id(alert_id)
    if alert is None:
        return error_response(message="Alert not found.", status_code=404)
    return success_response(data=AlertRead.model_validate(alert).model_dump(mode="json"))


@router.post(
    "",
    summary="Create an alert",
    status_code=status.HTTP_201_CREATED,
    response_class=JSONResponse,
)
async def create_alert(payload: AlertCreate, db: DbDep) -> JSONResponse:
    alert = AlertRepository(db).create(payload.model_dump())
    return success_response(
        data=AlertRead.model_validate(alert).model_dump(mode="json"),
        message="Alert created.",
        status_code=status.HTTP_201_CREATED,
    )


@router.post(
    "/{alert_id}/acknowledge",
    summary="Acknowledge an alert",
    description="Transition an alert from ``active`` to ``acknowledged`` status.",
    response_class=JSONResponse,
)
async def acknowledge_alert(alert_id: uuid.UUID, db: DbDep) -> JSONResponse:
    updated = AlertRepository(db).acknowledge(alert_id)
    if updated is None:
        return error_response(message="Alert not found.", status_code=404)
    return success_response(
        data=AlertRead.model_validate(updated).model_dump(mode="json"),
        message="Alert acknowledged.",
    )


@router.post(
    "/{alert_id}/resolve",
    summary="Resolve an alert",
    description="Transition an alert to ``resolved`` status.",
    response_class=JSONResponse,
)
async def resolve_alert(alert_id: uuid.UUID, db: DbDep) -> JSONResponse:
    updated = AlertRepository(db).resolve(alert_id)
    if updated is None:
        return error_response(message="Alert not found.", status_code=404)
    return success_response(
        data=AlertRead.model_validate(updated).model_dump(mode="json"),
        message="Alert resolved.",
    )


@router.put(
    "/{alert_id}",
    summary="Update an alert",
    response_class=JSONResponse,
)
async def update_alert(alert_id: uuid.UUID, payload: AlertUpdate, db: DbDep) -> JSONResponse:
    updated = AlertRepository(db).update(alert_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        return error_response(message="Alert not found.", status_code=404)
    return success_response(
        data=AlertRead.model_validate(updated).model_dump(mode="json"),
        message="Alert updated.",
    )
