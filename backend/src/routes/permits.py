"""
Permit-to-Work routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.permit import PermitRepository
from src.schemas.permit import PermitCreate, PermitRead, PermitUpdate
from src.utils.response import error_response, success_response

router: APIRouter = APIRouter(prefix="/permits", tags=["Permits"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    summary="List permits",
    description="Return a paginated list of all Permit-to-Work records.",
    response_class=JSONResponse,
)
async def list_permits(
    db: DbDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    active_only: bool = Query(False, description="When true, return only active permits"),
) -> JSONResponse:
    repo = PermitRepository(db)
    permits = repo.get_active() if active_only else repo.get_all(skip=skip, limit=limit)
    return success_response(
        data=[PermitRead.model_validate(p).model_dump(mode="json") for p in permits],
        message=f"{len(permits)} permit(s) retrieved.",
    )


@router.get(
    "/{permit_id}",
    summary="Get permit by ID",
    response_class=JSONResponse,
)
async def get_permit(permit_id: uuid.UUID, db: DbDep) -> JSONResponse:
    permit = PermitRepository(db).get_by_id(permit_id)
    if permit is None:
        return error_response(message="Permit not found.", status_code=404)
    return success_response(data=PermitRead.model_validate(permit).model_dump(mode="json"))


@router.post(
    "",
    summary="Issue a Permit-to-Work",
    status_code=status.HTTP_201_CREATED,
    response_class=JSONResponse,
)
async def create_permit(payload: PermitCreate, db: DbDep) -> JSONResponse:
    permit = PermitRepository(db).create(payload.model_dump())
    return success_response(
        data=PermitRead.model_validate(permit).model_dump(mode="json"),
        message="Permit issued.",
        status_code=status.HTTP_201_CREATED,
    )


@router.put(
    "/{permit_id}",
    summary="Update a permit",
    response_class=JSONResponse,
)
async def update_permit(permit_id: uuid.UUID, payload: PermitUpdate, db: DbDep) -> JSONResponse:
    updated = PermitRepository(db).update(permit_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        return error_response(message="Permit not found.", status_code=404)
    return success_response(
        data=PermitRead.model_validate(updated).model_dump(mode="json"),
        message="Permit updated.",
    )
