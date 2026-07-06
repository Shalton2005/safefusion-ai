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
from src.schemas.risk_score import RiskScoreCreate, RiskScoreRead
from src.schemas.sensor import SensorCreate, SensorRead
from src.schemas.worker import WorkerCreate, WorkerRead, WorkerUpdate

__all__: list[str] = [
    "WorkerCreate", "WorkerRead", "WorkerUpdate",
    "SensorCreate", "SensorRead",
    "PermitCreate", "PermitRead", "PermitUpdate",
    "MaintenanceLogCreate", "MaintenanceLogRead", "MaintenanceLogUpdate",
    "IncidentCreate", "IncidentRead", "IncidentUpdate",
    "AlertCreate", "AlertRead", "AlertUpdate",
    "RiskScoreCreate", "RiskScoreRead",
    "DashboardSummary", "ZoneSensorSummary", "DashboardResponse",
]
