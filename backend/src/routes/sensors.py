"""
Sensor data routes for SafeFusion AI API v1.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.database.session import get_db
from src.models.enums import SensorType
from src.repositories.sensor import SensorRepository
from src.schemas.sensor import SensorRead
from src.services.sensor import SensorService
from src.services.sensor_monitoring import (
    SensorMonitoringService,
    SensorThresholdBand,
)
from src.schemas.response.sensor_monitoring import SensorMonitoringSummaryResponse

router: APIRouter = APIRouter(prefix="/sensors", tags=["Sensors"])

DbDep = Annotated[Session, Depends(get_db)]


def get_sensor_service(db: DbDep) -> SensorService:
    """Create a service instance with repository dependencies."""
    return SensorService(repository=SensorRepository(db))


def _sensor_thresholds_from_settings() -> dict[SensorType, SensorThresholdBand]:
    return {
        SensorType.GAS: SensorThresholdBand(
            warning_max=settings.SENSOR_GAS_WARNING_MAX,
            critical_max=settings.SENSOR_GAS_CRITICAL_MAX,
        ),
        SensorType.TEMPERATURE: SensorThresholdBand(
            warning_max=settings.SENSOR_TEMPERATURE_WARNING_MAX,
            critical_max=settings.SENSOR_TEMPERATURE_CRITICAL_MAX,
        ),
        SensorType.PRESSURE: SensorThresholdBand(
            warning_max=settings.SENSOR_PRESSURE_WARNING_MAX,
            critical_max=settings.SENSOR_PRESSURE_CRITICAL_MAX,
        ),
        SensorType.HUMIDITY: SensorThresholdBand(
            warning_max=settings.SENSOR_HUMIDITY_WARNING_MAX,
            critical_max=settings.SENSOR_HUMIDITY_CRITICAL_MAX,
        ),
        SensorType.SMOKE: SensorThresholdBand(
            warning_max=settings.SENSOR_SMOKE_WARNING_MAX,
            critical_max=settings.SENSOR_SMOKE_CRITICAL_MAX,
        ),
    }


def get_sensor_monitoring_service(db: DbDep) -> SensorMonitoringService:
    """Create monitoring service with repository + configurable threshold policies."""
    return SensorMonitoringService(
        repository=SensorRepository(db),
        thresholds=_sensor_thresholds_from_settings(),
    )


SensorServiceDep = Annotated[SensorService, Depends(get_sensor_service)]
SensorMonitoringServiceDep = Annotated[
    SensorMonitoringService,
    Depends(get_sensor_monitoring_service),
]


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


@router.get(
    "/monitoring/summary",
    summary="Get sensor monitoring summary",
    description=(
        "Classifies latest sensor readings by zone and sensor type as "
        "Normal, Warning, or Critical using configurable thresholds."
    ),
    response_model=SensorMonitoringSummaryResponse,
    response_description="Structured sensor monitoring summary.",
)
def get_sensor_monitoring_summary(
    service: SensorMonitoringServiceDep,
) -> SensorMonitoringSummaryResponse:
    summary = service.get_monitoring_summary()
    return SensorMonitoringSummaryResponse.model_validate(summary)
