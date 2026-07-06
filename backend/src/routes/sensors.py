"""
Sensor data routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.sensor import SensorRepository
from src.schemas.sensor import SensorCreate, SensorRead
from src.utils.response import error_response, success_response

router: APIRouter = APIRouter(prefix="/sensors", tags=["Sensors"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    summary="List sensor readings",
    description="Return a paginated list of all ingested sensor readings.",
    response_class=JSONResponse,
)
async def list_sensors(
    db: DbDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> JSONResponse:
    sensors = SensorRepository(db).get_all(skip=skip, limit=limit)
    return success_response(
        data=[SensorRead.model_validate(s).model_dump(mode="json") for s in sensors],
        message=f"{len(sensors)} sensor reading(s) retrieved.",
    )


@router.get(
    "/zone/{zone}",
    summary="Get sensor readings by zone",
    description="Return all sensor readings for the specified plant zone.",
    response_class=JSONResponse,
)
async def get_sensors_by_zone(zone: str, db: DbDep) -> JSONResponse:
    sensors = SensorRepository(db).get_by_zone(zone)
    return success_response(
        data=[SensorRead.model_validate(s).model_dump(mode="json") for s in sensors],
        message=f"{len(sensors)} reading(s) for zone '{zone}'.",
    )


@router.get(
    "/{sensor_id}",
    summary="Get sensor reading by ID",
    response_class=JSONResponse,
)
async def get_sensor(sensor_id: uuid.UUID, db: DbDep) -> JSONResponse:
    sensor = SensorRepository(db).get_by_id(sensor_id)
    if sensor is None:
        return error_response(message="Sensor reading not found.", status_code=404)
    return success_response(data=SensorRead.model_validate(sensor).model_dump(mode="json"))


@router.post(
    "",
    summary="Ingest sensor data",
    description="Accept a new sensor reading from the IoT / SCADA simulator.",
    status_code=status.HTTP_201_CREATED,
    response_class=JSONResponse,
)
async def ingest_sensor_data(payload: SensorCreate, db: DbDep) -> JSONResponse:
    sensor = SensorRepository(db).create(payload.model_dump())
    return success_response(
        data=SensorRead.model_validate(sensor).model_dump(mode="json"),
        message="Sensor reading ingested.",
        status_code=status.HTTP_201_CREATED,
    )
