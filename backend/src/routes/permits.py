"""
Permit-to-Work routes for SafeFusion AI API v1.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.permit import PermitRepository
from src.schemas.permit import PermitRead
from src.services.permit import PermitService

router: APIRouter = APIRouter(prefix="/permits", tags=["Permits"])

DbDep = Annotated[Session, Depends(get_db)]


def get_permit_service(db: DbDep) -> PermitService:
    """Create a service instance with repository dependencies."""
    return PermitService(repository=PermitRepository(db))


PermitServiceDep = Annotated[PermitService, Depends(get_permit_service)]


@router.get(
    "",
    summary="List permits",
    description="Return a paginated list of all Permit-to-Work records.",
    response_model=list[PermitRead],
)
async def list_permits(
    service: PermitServiceDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[PermitRead]:
    permits = service.list_permits(skip=skip, limit=limit)
    return [PermitRead.model_validate(permit) for permit in permits]
