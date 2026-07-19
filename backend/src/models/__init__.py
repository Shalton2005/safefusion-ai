"""
Models package for SafeFusion AI backend.

All ORM model classes are imported here so that SQLAlchemy's metadata
registry and Alembic's autogenerate can discover every table definition
from a single import in ``alembic/env.py``::

    import src.models  # noqa: F401 — registers all models
"""

from src.models.alert import Alert
from src.models.document_embedding import DocumentEmbedding
from src.models.enums import (
    AlertStatus,
    AlertType,
    IncidentType,
    MaintenanceStatus,
    MaintenanceType,
    PermitStatus,
    PermitType,
    RiskLevel,
    SensorStatus,
    SensorType,
    SeverityLevel,
    UserRole,
    WorkerStatus,
)
from src.models.incident import Incident
from src.models.maintenance import MaintenanceLog
from src.models.permit import Permit
from src.models.risk_score import RiskScore
from src.models.sensor import Sensor
from src.models.timeline_event import TimelineEvent
from src.models.user import User
from src.models.worker import Worker

__all__: list[str] = [
    # Models
    "User",
    "Worker",
    "Sensor",
    "Permit",
    "MaintenanceLog",
    "Incident",
    "Alert",
    "RiskScore",
    "DocumentEmbedding",
    "TimelineEvent",
    # Enums
    "WorkerStatus",
    "UserRole",
    "SensorType",
    "SensorStatus",
    "PermitType",
    "PermitStatus",
    "MaintenanceType",
    "MaintenanceStatus",
    "SeverityLevel",
    "IncidentType",
    "AlertType",
    "AlertStatus",
    "RiskLevel",
]
