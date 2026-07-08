"""
Schemas package for SafeFusion AI backend.

Re-exports all Pydantic v2 request/response schema classes so any
module can import them from the package root::

    from src.schemas import WorkerRead, WorkerCreate
"""

from src.schemas.alert import AlertCreate, AlertRead, AlertUpdate
from src.schemas.dashboard import DashboardResponse, DashboardSummary, ZoneSensorSummary
from src.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate
from src.schemas.maintenance import (
    MaintenanceLogCreate,
    MaintenanceLogRead,
    MaintenanceLogUpdate,
)
from src.schemas.permit import PermitCreate, PermitRead, PermitUpdate
from src.schemas.risk_score import RiskScoreCreate, RiskScoreRead, RiskScoreUpdate
from src.schemas.sensor import SensorCreate, SensorRead
from src.schemas.worker import WorkerCreate, WorkerRead, WorkerUpdate
from src.validators import (
    AlertSchema,
    IncidentSchema,
    MaintenanceLogSchema,
    PermitSchema,
    RiskScoreSchema,
    SensorSchema,
    WorkerSchema,
)
from src.schemas.request import (
    AlertCreateRequest,
    AlertUpdateRequest,
    IncidentCreateRequest,
    IncidentUpdateRequest,
    MaintenanceLogCreateRequest,
    MaintenanceLogUpdateRequest,
    PermitCreateRequest,
    PermitUpdateRequest,
    RiskScoreCreateRequest,
    RiskScoreUpdateRequest,
    SensorCreateRequest,
    WorkerCreateRequest,
    WorkerUpdateRequest,
)
from src.schemas.response import (
    AlertResponse,
    IncidentResponse,
    MaintenanceLogResponse,
    PermitResponse,
    RiskScoreResponse,
    SensorResponse,
    WorkerResponse,
)

__all__: list[str] = [
    "WorkerCreate", "WorkerRead", "WorkerUpdate",
    "SensorCreate", "SensorRead",
    "PermitCreate", "PermitRead", "PermitUpdate",
    "MaintenanceLogCreate", "MaintenanceLogRead", "MaintenanceLogUpdate",
    "IncidentCreate", "IncidentRead", "IncidentUpdate",
    "AlertCreate", "AlertRead", "AlertUpdate",
    "RiskScoreCreate", "RiskScoreRead",
    "RiskScoreUpdate",
    "DashboardSummary", "ZoneSensorSummary", "DashboardResponse",
    "WorkerSchema", "SensorSchema", "PermitSchema", "AlertSchema", "IncidentSchema",
    "MaintenanceLogSchema", "RiskScoreSchema",
    "WorkerCreateRequest", "WorkerUpdateRequest", "WorkerResponse",
    "SensorCreateRequest", "SensorResponse",
    "PermitCreateRequest", "PermitUpdateRequest", "PermitResponse",
    "AlertCreateRequest", "AlertUpdateRequest", "AlertResponse",
    "IncidentCreateRequest", "IncidentUpdateRequest", "IncidentResponse",
    "MaintenanceLogCreateRequest", "MaintenanceLogUpdateRequest", "MaintenanceLogResponse",
    "RiskScoreCreateRequest", "RiskScoreUpdateRequest", "RiskScoreResponse",
]
