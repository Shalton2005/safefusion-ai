"""Unified monitoring routes for SafeFusion AI API v1.

Thin Route -> Service -> Repository endpoints exposing the sensor,
worker, permit, and risk monitoring summaries under a single
``/monitoring`` namespace, plus a combined ``/monitoring/summary``.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.risk_rules import (
    COMPOUND_RISK_LEVEL_BANDS,
    COMPOUND_RISK_RULES,
    RISK_SCORE_LEVEL_BANDS,
    RISK_SCORE_RULES,
)
from src.config.settings import settings
from src.database.session import get_db
from src.models.enums import PermitStatus, SensorType
from src.repositories.maintenance import MaintenanceLogRepository
from src.repositories.permit import PermitRepository
from src.repositories.risk_score import RiskScoreRepository
from src.repositories.sensor import SensorRepository
from src.repositories.worker import WorkerRepository
from src.schemas.response.compound_risk import CompoundRiskDetectionResultResponse
from src.schemas.response.monitoring import MonitoringSummaryResponse
from src.schemas.response.permit_validation import PermitValidationSummaryResponse
from src.schemas.response.risk_scoring import RiskScoreCalculationResultResponse
from src.schemas.response.sensor_monitoring import SensorMonitoringSummaryResponse
from src.schemas.response.worker_monitoring import WorkerMonitoringSummaryResponse
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.compound_risk.engine import CompoundRiskEngine
from src.services.compound_risk.rules import (
    CriticalSensorNearDegradedEquipmentRule,
    CriticalSensorWithoutActivePermitRule,
    CriticalSensorWithWorkerPresentRule,
    DegradedEquipmentWithWorkerPresentRule,
    ExpiredPermitWithWorkerPresentRule,
    MultipleWarningSensorsRule,
    RestrictedZoneWithoutActivePermitRule,
)
from src.services.compound_risk.schemas import CompoundRiskLevelBands
from src.services.maintenance_monitoring import EquipmentHealthBand, MaintenanceMonitoringService
from src.services.permit_validation import PermitValidationRules, PermitValidationService
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

router: APIRouter = APIRouter(prefix="/monitoring", tags=["Monitoring"])

DbDep = Annotated[Session, Depends(get_db)]


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
    """Create the sensor monitoring service with repository + configurable thresholds."""
    return SensorMonitoringService(
        repository=SensorRepository(db),
        thresholds=_sensor_thresholds_from_settings(),
    )


def get_worker_monitoring_service(db: DbDep) -> WorkerMonitoringService:
    """Create the worker monitoring service with repository dependencies."""
    return WorkerMonitoringService(
        worker_repository=WorkerRepository(db),
        permit_repository=PermitRepository(db),
    )


def get_maintenance_monitoring_service(db: DbDep) -> MaintenanceMonitoringService:
    """Create the maintenance monitoring (equipment health) service."""
    return MaintenanceMonitoringService(
        repository=MaintenanceLogRepository(db),
        health_band=EquipmentHealthBand(
            at_risk_corrective_ratio=settings.EQUIPMENT_HEALTH_AT_RISK_CORRECTIVE_RATIO,
            degraded_corrective_ratio=settings.EQUIPMENT_HEALTH_DEGRADED_CORRECTIVE_RATIO,
        ),
    )


def _permit_validation_rules() -> PermitValidationRules:
    return PermitValidationRules(
        valid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_VALID_STATUSES},
        pending_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_PENDING_STATUSES},
        invalid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_INVALID_STATUSES},
        expired_grace_seconds=settings.PERMIT_VALIDATION_EXPIRED_GRACE_SECONDS,
    )


def get_permit_validation_service(db: DbDep) -> PermitValidationService:
    """Create the permit validation service with configured business rules."""
    return PermitValidationService(rules=_permit_validation_rules())


def get_permit_repository(db: DbDep) -> PermitRepository:
    """Create the permit repository for the current request."""
    return PermitRepository(db)


class _PermitValidationSummaryAdapter:
    """Adapts ``PermitValidationService`` + repository into the summary-only port."""

    def __init__(self, validation_service: PermitValidationService, repository: PermitRepository) -> None:
        self._validation_service = validation_service
        self._repository = repository

    def get_validation_summary(self) -> dict:
        permits = self._repository.get_all(skip=0, limit=10_000)
        return self._validation_service.build_validation_summary(permits)


def _build_risk_score_engine() -> RiskScoreEngine:
    """Build the Risk Score Engine from the centralised rule registry."""
    rules = RISK_SCORE_RULES
    factors: list = [
        CriticalSensorFactor(weight=rules["critical_sensors"].points),
        WarningSensorFactor(weight=rules["warning_sensors"].points),
        ExpiredPermitFactor(weight=rules["expired_permits"].points),
        RestrictedZoneWorkerFactor(
            weight=rules["restricted_zone_workers"].points,
            restricted_zones=rules["restricted_zone_workers"].params["restricted_zones"],
        ),
    ]
    return RiskScoreEngine(
        factors=factors,
        level_bands=RiskLevelBands(**RISK_SCORE_LEVEL_BANDS),
    )


def get_risk_score_calculation_service(db: DbDep) -> RiskScoreCalculationService:
    """Create the risk score calculation service with monitoring sources and engine wired in."""
    return RiskScoreCalculationService(
        repository=RiskScoreRepository(db),
        risk_engine=_build_risk_score_engine(),
        sensor_monitoring=get_sensor_monitoring_service(db),
        permit_validation=_PermitValidationSummaryAdapter(
            get_permit_validation_service(db), PermitRepository(db)
        ),
        worker_monitoring=get_worker_monitoring_service(db),
    )


def _build_compound_risk_engine() -> CompoundRiskEngine:
    """Build the Compound Risk Engine from the centralised rule registry."""
    rules = COMPOUND_RISK_RULES
    engine_rules: list = [
        CriticalSensorWithoutActivePermitRule(
            points=rules["critical_sensor_without_active_permit"].points
        ),
        ExpiredPermitWithWorkerPresentRule(
            points=rules["expired_permit_with_worker_present"].points
        ),
        CriticalSensorWithWorkerPresentRule(
            points=rules["critical_sensor_with_worker_present"].points
        ),
        RestrictedZoneWithoutActivePermitRule(
            points=rules["restricted_zone_without_active_permit"].points,
            restricted_zones=rules["restricted_zone_without_active_permit"].params["restricted_zones"],
        ),
        MultipleWarningSensorsRule(
            points=rules["multiple_warning_sensors"].points,
            minimum_warning_count=rules["multiple_warning_sensors"].params["minimum_warning_count"],
        ),
        DegradedEquipmentWithWorkerPresentRule(
            points=rules["degraded_equipment_with_worker_present"].points,
            equipment_zone_map=rules["degraded_equipment_with_worker_present"].params["equipment_zone_map"],
        ),
        CriticalSensorNearDegradedEquipmentRule(
            points=rules["critical_sensor_near_degraded_equipment"].points,
            equipment_zone_map=rules["critical_sensor_near_degraded_equipment"].params["equipment_zone_map"],
        ),
    ]
    return CompoundRiskEngine(
        rules=engine_rules,
        level_bands=CompoundRiskLevelBands(**COMPOUND_RISK_LEVEL_BANDS),
    )


def get_compound_risk_service(db: DbDep) -> CompoundRiskService:
    """Create the compound risk detection service with monitoring sources and engine wired in."""
    return CompoundRiskService(
        engine=_build_compound_risk_engine(),
        sensor_monitoring=get_sensor_monitoring_service(db),
        worker_monitoring=get_worker_monitoring_service(db),
        permit_validation=_PermitValidationSummaryAdapter(
            get_permit_validation_service(db), PermitRepository(db)
        ),
        maintenance_monitoring=get_maintenance_monitoring_service(db),
    )


SensorMonitoringServiceDep = Annotated[SensorMonitoringService, Depends(get_sensor_monitoring_service)]
WorkerMonitoringServiceDep = Annotated[WorkerMonitoringService, Depends(get_worker_monitoring_service)]
PermitValidationServiceDep = Annotated[PermitValidationService, Depends(get_permit_validation_service)]
PermitRepositoryDep = Annotated[PermitRepository, Depends(get_permit_repository)]
RiskScoreCalculationServiceDep = Annotated[
    RiskScoreCalculationService,
    Depends(get_risk_score_calculation_service),
]
CompoundRiskServiceDep = Annotated[CompoundRiskService, Depends(get_compound_risk_service)]
MaintenanceMonitoringServiceDep = Annotated[
    MaintenanceMonitoringService,
    Depends(get_maintenance_monitoring_service),
]


@router.get(
    "/sensors",
    summary="Get sensor monitoring summary",
    description="Classifies latest sensor readings by zone and sensor type using configurable thresholds.",
    response_model=SensorMonitoringSummaryResponse,
    response_description="Structured sensor monitoring summary.",
)
def get_sensor_monitoring(service: SensorMonitoringServiceDep) -> SensorMonitoringSummaryResponse:
    return SensorMonitoringSummaryResponse.model_validate(service.get_monitoring_summary())


@router.get(
    "/workers",
    summary="Get worker monitoring summary",
    description="Returns monitoring-oriented worker status, zone assignment, and active permit association.",
    response_model=WorkerMonitoringSummaryResponse,
    response_description="Structured worker monitoring summary.",
)
def get_worker_monitoring(service: WorkerMonitoringServiceDep) -> WorkerMonitoringSummaryResponse:
    return WorkerMonitoringSummaryResponse.model_validate(service.get_monitoring_summary())


@router.get(
    "/permits",
    summary="Get permit monitoring summary",
    description="Classifies permits as Valid, Expired, Pending, or Invalid using configured business rules.",
    response_model=PermitValidationSummaryResponse,
    response_description="Structured permit monitoring summary.",
)
def get_permit_monitoring(
    service: PermitValidationServiceDep,
    permit_repository: PermitRepositoryDep,
) -> PermitValidationSummaryResponse:
    permits = permit_repository.get_all(skip=0, limit=10_000)
    return PermitValidationSummaryResponse.model_validate(service.build_validation_summary(permits))


@router.get(
    "/risk",
    summary="Get risk summary",
    description=(
        "Runs the rule-based Risk Score Engine over the latest monitoring outputs and "
        "returns a per-zone score, risk level, and contributing factors without persisting."
    ),
    response_model=RiskScoreCalculationResultResponse,
    response_description="Structured per-zone risk summary.",
)
def get_risk_summary(
    service: RiskScoreCalculationServiceDep,
) -> RiskScoreCalculationResultResponse:
    results = service.calculate_risk_scores()
    return RiskScoreCalculationResultResponse(zone_count=len(results), results=results)


@router.get(
    "/compound-risk",
    summary="Get compound risk detection summary",
    description=(
        "Runs the configurable compound risk rule engine over the latest sensor, worker, "
        "and permit monitoring summaries and returns, per affected zone, a risk score, "
        "risk level, triggered rules, and a plain-language explanation. Rule-based only, "
        "no AI/ML involved."
    ),
    response_model=CompoundRiskDetectionResultResponse,
    response_description="Structured per-zone compound risk detection summary.",
)
def get_compound_risk_summary(
    service: CompoundRiskServiceDep,
) -> CompoundRiskDetectionResultResponse:
    results = service.detect_compound_risks()
    return CompoundRiskDetectionResultResponse(zone_count=len(results), results=results)


@router.get(
    "/summary",
    summary="Get combined monitoring summary",
    description="Returns sensor, worker, permit, and risk monitoring summaries in a single response.",
    response_model=MonitoringSummaryResponse,
    response_description="Combined monitoring summary across all domains.",
)
def get_monitoring_summary(
    sensor_service: SensorMonitoringServiceDep,
    worker_service: WorkerMonitoringServiceDep,
    permit_service: PermitValidationServiceDep,
    risk_service: RiskScoreCalculationServiceDep,
    compound_risk_service: CompoundRiskServiceDep,
    permit_repository: PermitRepositoryDep,
    maintenance_service: MaintenanceMonitoringServiceDep,
) -> MonitoringSummaryResponse:
    permits = permit_repository.get_all(skip=0, limit=10_000)

    # Fetch each monitoring summary exactly once and share it across both risk
    # engines, instead of letting each engine's service independently re-query
    # sensors/workers/permits (risk_service and compound_risk_service otherwise
    # each pull their own copies, tripling DB round trips for this endpoint).
    sensor_summary = sensor_service.get_monitoring_summary()
    worker_summary = worker_service.get_monitoring_summary()
    permit_summary = permit_service.build_validation_summary(permits)
    maintenance_summary = maintenance_service.get_monitoring_summary()

    risk_results = risk_service.calculate_from_summaries(
        sensor_summary=sensor_summary, permit_summary=permit_summary, worker_summary=worker_summary
    )
    compound_risk_results = compound_risk_service.evaluate(
        sensor_summary=sensor_summary,
        permit_summary=permit_summary,
        worker_summary=worker_summary,
        maintenance_summary=maintenance_summary,
    )

    return MonitoringSummaryResponse(
        sensors=SensorMonitoringSummaryResponse.model_validate(sensor_summary),
        workers=WorkerMonitoringSummaryResponse.model_validate(worker_summary),
        permits=PermitValidationSummaryResponse.model_validate(permit_summary),
        risk=RiskScoreCalculationResultResponse(zone_count=len(risk_results), results=risk_results),
        compound_risk=CompoundRiskDetectionResultResponse(
            zone_count=len(compound_risk_results), results=compound_risk_results
        ),
    )
