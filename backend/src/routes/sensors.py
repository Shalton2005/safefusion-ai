"""
Sensor data routes for SafeFusion AI API v1.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.sensor import SensorRepository
from src.schemas.sensor import SensorRead
from src.services.sensor import SensorService

router: APIRouter = APIRouter(prefix="/sensors", tags=["Sensors"])

DbDep = Annotated[Session, Depends(get_db)]


def get_sensor_service(db: DbDep) -> SensorService:
    """Create a service instance with repository dependencies."""
    return SensorService(repository=SensorRepository(db))


SensorServiceDep = Annotated[SensorService, Depends(get_sensor_service)]


@router.get(
    "",
    summary="List sensor readings",
    description="Retrieve a paginated list of ingested industrial sensor readings across all configured plant zones.",
    response_model=list[SensorRead],
    response_description="List of sensor readings.",
)
def list_sensors(
    service: SensorServiceDep,
    skip: int = Query(0, ge=0, description="Number of sensor readings to skip before returning results.", examples=[0]),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of sensor readings to return.", examples=[100]),
) -> list[SensorRead]:
    sensors = service.list_sensors(skip=skip, limit=limit)
    return [SensorRead.model_validate(sensor) for sensor in sensors]
