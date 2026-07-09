"""Response schema for the combined monitoring summary endpoint."""

from src.schemas.base import AppBaseModel
from src.schemas.response.permit_validation import PermitValidationSummaryResponse
from src.schemas.response.risk_scoring import RiskScoreCalculationResultResponse
from src.schemas.response.sensor_monitoring import SensorMonitoringSummaryResponse
from src.schemas.response.worker_monitoring import WorkerMonitoringSummaryResponse


class MonitoringSummaryResponse(AppBaseModel):
    """Combined sensor, worker, permit, and risk monitoring summary."""

    sensors: SensorMonitoringSummaryResponse
    workers: WorkerMonitoringSummaryResponse
    permits: PermitValidationSummaryResponse
    risk: RiskScoreCalculationResultResponse
