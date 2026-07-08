"""Request schema package exports."""

from src.schemas.request.alert import AlertCreateRequest, AlertUpdateRequest
from src.schemas.request.incident import IncidentCreateRequest, IncidentUpdateRequest
from src.schemas.request.maintenance import MaintenanceLogCreateRequest, MaintenanceLogUpdateRequest
from src.schemas.request.permit import PermitCreateRequest, PermitUpdateRequest
from src.schemas.request.risk_score import RiskScoreCreateRequest, RiskScoreUpdateRequest
from src.schemas.request.sensor import SensorCreateRequest
from src.schemas.request.worker import WorkerCreateRequest, WorkerUpdateRequest

__all__: list[str] = [
    "WorkerCreateRequest",
    "WorkerUpdateRequest",
    "SensorCreateRequest",
    "PermitCreateRequest",
    "PermitUpdateRequest",
    "MaintenanceLogCreateRequest",
    "MaintenanceLogUpdateRequest",
    "AlertCreateRequest",
    "AlertUpdateRequest",
    "IncidentCreateRequest",
    "IncidentUpdateRequest",
    "RiskScoreCreateRequest",
    "RiskScoreUpdateRequest",
]
