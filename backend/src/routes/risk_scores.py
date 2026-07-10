"""
Risk Score routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from src.config.risk_rules import RISK_SCORE_LEVEL_BANDS, RISK_SCORE_RULES
from src.config.settings import settings
from src.database.session import get_db
from src.models.enums import PermitStatus, SensorType
from src.repositories.permit import PermitRepository
from src.repositories.risk_score import RiskScoreRepository
from src.repositories.sensor import SensorRepository
from src.repositories.worker import WorkerRepository
from src.schemas.response.risk_scoring import RiskScoreCalculationResultResponse
from src.schemas.risk_score import RiskScoreCreate, RiskScoreRead, RiskScoreUpdate
from src.services.permit_validation import PermitValidationRules, PermitValidationService
from src.services.risk_score import RiskScoreService
from src.services.risk_score_calculation import RiskScoreCalculationService
from src.services.risk_scoring import (
    CriticalSensorFactor,
    ExpiredPermitFactor,
    RestrictedZoneWorkerFactor,
    RiskLevelBands,
    RiskScoreEngine,
    WarningSensorFactor,
)
from src.services.sensor_monitoring import SensorMonitoringService, SensorThresholdBand
from src.services.worker_monitoring import WorkerMonitoringService

router: APIRouter = APIRouter(prefix="/risk-scores", tags=["Risk Scores"])

DbDep = Annotated[Session, Depends(get_db)]


def get_risk_score_service(db: DbDep) -> RiskScoreService:
    """Create a service instance with repository dependencies."""
    return RiskScoreService(repository=RiskScoreRepository(db))


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


class _PermitValidationSummaryAdapter:
    """Adapts ``PermitValidationService`` + repository into the summary-only port."""

    def __init__(self, validation_service: PermitValidationService, repository: PermitRepository) -> None:
        self._validation_service = validation_service
        self._repository = repository

    def get_validation_summary(self) -> dict:
        permits = self._repository.get_all(skip=0, limit=10_000)
        return self._validation_service.build_validation_summary(permits)


def get_risk_score_calculation_service(db: DbDep) -> RiskScoreCalculationService:
    """Create the risk score calculation service with monitoring sources and engine wired in."""
    sensor_monitoring = SensorMonitoringService(
        repository=SensorRepository(db),
        thresholds=_sensor_thresholds_from_settings(),
    )
    permit_validation_rules = PermitValidationRules(
        valid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_VALID_STATUSES},
        pending_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_PENDING_STATUSES},
        invalid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_INVALID_STATUSES},
        expired_grace_seconds=settings.PERMIT_VALIDATION_EXPIRED_GRACE_SECONDS,
    )
    permit_validation = _PermitValidationSummaryAdapter(
        PermitValidationService(rules=permit_validation_rules), PermitRepository(db)
    )
    worker_monitoring = WorkerMonitoringService(
        worker_repository=WorkerRepository(db),
        permit_repository=PermitRepository(db),
    )

    rules = RISK_SCORE_RULES
    risk_engine = RiskScoreEngine(
        factors=[
            CriticalSensorFactor(weight=rules["critical_sensors"].points),
            WarningSensorFactor(weight=rules["warning_sensors"].points),
            ExpiredPermitFactor(weight=rules["expired_permits"].points),
            RestrictedZoneWorkerFactor(
                weight=rules["restricted_zone_workers"].points,
                restricted_zones=rules["restricted_zone_workers"].params["restricted_zones"],
            ),
        ],
        level_bands=RiskLevelBands(**RISK_SCORE_LEVEL_BANDS),
    )

    return RiskScoreCalculationService(
        repository=RiskScoreRepository(db),
        risk_engine=risk_engine,
        sensor_monitoring=sensor_monitoring,
        permit_validation=permit_validation,
        worker_monitoring=worker_monitoring,
    )


RiskScoreServiceDep = Annotated[RiskScoreService, Depends(get_risk_score_service)]
RiskScoreCalculationServiceDep = Annotated[
    RiskScoreCalculationService,
    Depends(get_risk_score_calculation_service),
]


@router.get(
    "",
    summary="List risk scores",
    description="Retrieve a paginated list of recorded risk assessments and zone-level risk score analyses.",
    response_model=list[RiskScoreRead],
    response_description="List of risk score records.",
)
def list_risk_scores(
    service: RiskScoreServiceDep,
    skip: int = Query(0, ge=0, description="Number of risk score records to skip before returning results.", examples=[0]),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of risk score records to return.", examples=[100]),
) -> list[RiskScoreRead]:
    scores = service.list_risk_scores(skip=skip, limit=limit)
    return [RiskScoreRead.model_validate(score) for score in scores]


@router.post(
    "/calculate",
    summary="Run the risk score engine",
    description=(
        "Combines the latest sensor, permit, and worker monitoring outputs using "
        "configurable weighted rules to calculate an overall risk score, risk level, "
        "and contributing factors for each zone with signal. Version 1 rule-based engine."
    ),
    response_model=RiskScoreCalculationResultResponse,
    response_description="Per-zone risk score results (score, risk level, contributing factors).",
)
def calculate_risk_scores(
    service: RiskScoreCalculationServiceDep,
    persist: bool = Query(
        True,
        description="When true, persist each calculated zone result as a new risk score record.",
    ),
) -> RiskScoreCalculationResultResponse:
    results = service.calculate_risk_scores()
    if persist:
        service.persist_risk_scores(results)
    return RiskScoreCalculationResultResponse(zone_count=len(results), results=results)


@router.get(
    "/{score_id}",
    summary="Get risk score by ID",
    response_model=RiskScoreRead,
    response_description="Risk score record.",
)
def get_risk_score(
    score_id: Annotated[uuid.UUID, Path(description="Unique identifier of the risk score record.")],
    service: RiskScoreServiceDep,
) -> RiskScoreRead:
    score = service.get_risk_score_by_id(score_id)
    if score is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk score not found.")
    return RiskScoreRead.model_validate(score)


@router.post(
    "",
    summary="Record a risk score",
    description="Persist a new AI-generated compound risk analysis result.",
    status_code=status.HTTP_201_CREATED,
    response_model=RiskScoreRead,
    response_description="Created risk score record.",
)
def create_risk_score(
    payload: Annotated[
        RiskScoreCreate,
        Body(
            openapi_examples={
                "default": {
                    "summary": "Create risk score example",
                    "value": {
                        "zone": "Zone-A",
                        "risk_score": 72.5,
                        "risk_level": "high",
                        "contributing_factors": "High gas reading, active hot-work permit, wet conditions.",
                        "recommendation": "Halt hot-work operations and ventilate zone immediately.",
                    },
                }
            }
        ),
    ],
    service: RiskScoreServiceDep,
) -> RiskScoreRead:
    score = service.create_risk_score(payload.model_dump())
    return RiskScoreRead.model_validate(score)


@router.put(
    "/{score_id}",
    summary="Update a risk score",
    response_model=RiskScoreRead,
    response_description="Updated risk score record.",
)
def update_risk_score(
    score_id: Annotated[uuid.UUID, Path(description="Unique identifier of the risk score record.")],
    payload: Annotated[
        RiskScoreUpdate,
        Body(
            openapi_examples={
                "revised-assessment": {
                    "summary": "Update risk assessment",
                    "value": {"risk_score": 61.0, "risk_level": "medium", "recommendation": "Continue monitoring and verify gas trend."},
                }
            }
        ),
    ],
    service: RiskScoreServiceDep,
) -> RiskScoreRead:
    updated = service.update_risk_score(score_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk score not found.")
    return RiskScoreRead.model_validate(updated)


@router.delete(
    "/{score_id}",
    summary="Delete a risk score",
    description="Delete a risk score record by its unique identifier.",
    status_code=status.HTTP_204_NO_CONTENT,
    response_description="Risk score record deleted successfully.",
)
def delete_risk_score(
    score_id: Annotated[uuid.UUID, Path(description="Unique identifier of the risk score record.")],
    service: RiskScoreServiceDep,
) -> Response:
    if not service.delete_risk_score(score_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk score not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
