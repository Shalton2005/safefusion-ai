"""
Permit-to-Work routes for SafeFusion AI API v1.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.database.session import get_db
from src.models.enums import PermitStatus
from src.repositories.permit import PermitRepository
from src.schemas.permit import PermitRead
from src.schemas.response.permit_validation import PermitValidationSummaryResponse
from src.services.permit import PermitService
from src.services.permit_validation import PermitValidationRules, PermitValidationService

router: APIRouter = APIRouter(prefix="/permits", tags=["Permits"])

DbDep = Annotated[Session, Depends(get_db)]


def get_permit_service(db: DbDep) -> PermitService:
    """Create a service instance with repository dependencies."""
    rules = PermitValidationRules(
        valid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_VALID_STATUSES},
        pending_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_PENDING_STATUSES},
        invalid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_INVALID_STATUSES},
        expired_grace_seconds=settings.PERMIT_VALIDATION_EXPIRED_GRACE_SECONDS,
    )
    return PermitService(
        repository=PermitRepository(db),
        validation_service=PermitValidationService(rules=rules),
    )


PermitServiceDep = Annotated[PermitService, Depends(get_permit_service)]


@router.get(
    "",
    summary="List permits",
    description="Retrieve a paginated list of Permit-to-Work records for active and historical work authorizations.",
    response_model=list[PermitRead],
    response_description="List of permit records.",
)
def list_permits(
    service: PermitServiceDep,
    skip: int = Query(0, ge=0, description="Number of permit records to skip before returning results.", examples=[0]),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of permit records to return.", examples=[100]),
) -> list[PermitRead]:
    permits = service.list_permits(skip=skip, limit=limit)
    return [PermitRead.model_validate(permit) for permit in permits]


@router.get(
    "/validation/summary",
    summary="Get permit validation summary",
    description=(
        "Classifies permits as Valid, Expired, Pending, or Invalid using "
        "configured business rules for status and permit time window validation."
    ),
    response_model=PermitValidationSummaryResponse,
    response_description="Structured permit validation summary.",
)
def get_permit_validation_summary(service: PermitServiceDep) -> PermitValidationSummaryResponse:
    summary = service.get_validation_summary()
    return PermitValidationSummaryResponse.model_validate(summary)
