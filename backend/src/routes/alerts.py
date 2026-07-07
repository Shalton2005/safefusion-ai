"""
Alert routes for SafeFusion AI API v1.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.alert import AlertRepository
from src.schemas.alert import AlertRead
from src.services.alert import AlertService

router: APIRouter = APIRouter(prefix="/alerts", tags=["Alerts"])

DbDep = Annotated[Session, Depends(get_db)]


def get_alert_service(db: DbDep) -> AlertService:
    """Create a service instance with repository dependencies."""
    return AlertService(repository=AlertRepository(db))


AlertServiceDep = Annotated[AlertService, Depends(get_alert_service)]


@router.get(
    "",
    summary="List alerts",
    description="Return a paginated list of all safety alerts.",
    response_model=list[AlertRead],
)
async def list_alerts(
    service: AlertServiceDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[AlertRead]:
    alerts = service.list_alerts(skip=skip, limit=limit)
    return [AlertRead.model_validate(alert) for alert in alerts]
