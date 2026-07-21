"""
Domain enumeration types for SafeFusion AI.

All enum classes inherit from ``str`` so that Pydantic schemas can
serialize them directly to their string values without extra conversion.

SQLAlchemy stores them as VARCHAR columns (``native_enum=False``) to
avoid PostgreSQL ``CREATE TYPE`` overhead and keep migrations portable.
"""

from enum import Enum


class WorkerStatus(str, Enum):
    WORKING = "working"
    IDLE = "idle"
    EMERGENCY = "emergency"


class UserRole(str, Enum):
    """API account authorization role (distinct from ``Worker.role``, which is a job title)."""

    ADMIN = "admin"
    SAFETY_OFFICER = "safety_officer"
    VIEWER = "viewer"


class SensorType(str, Enum):
    GAS = "gas"
    TEMPERATURE = "temperature"
    PRESSURE = "pressure"
    HUMIDITY = "humidity"
    SMOKE = "smoke"


class SensorStatus(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"


class PermitType(str, Enum):
    HOT_WORK = "hot_work"
    CONFINED_SPACE = "confined_space"
    ELECTRICAL_ISOLATION = "electrical_isolation"
    WORKING_AT_HEIGHT = "working_at_height"
    EXCAVATION = "excavation"
    PRESSURE_TESTING = "pressure_testing"
    LINE_BREAKING = "line_breaking"
    LOTO = "loto"
    CHEMICAL_TRANSFER = "chemical_transfer"


class PermitStatus(str, Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    SUSPENDED = "suspended"


class PermitValidationState(str, Enum):
    VALID = "valid"
    EXPIRED = "expired"
    PENDING = "pending"
    INVALID = "invalid"


class MaintenanceType(str, Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"


class MaintenanceStatus(str, Enum):
    PLANNED = "planned"
    ONGOING = "ongoing"
    COMPLETED = "completed"


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentType(str, Enum):
    GAS_LEAK = "gas_leak"
    FIRE = "fire"
    EXPLOSION = "explosion"
    PPE_VIOLATION = "ppe_violation"
    EMERGENCY_RESPONSE = "emergency_response"
    WORKER_COLLAPSE = "worker_collapse"


class AlertType(str, Enum):
    WARNING = "warning"
    CRITICAL = "critical"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertSource(str, Enum):
    SENSOR_MONITORING = "sensor_monitoring"
    PERMIT_VALIDATION = "permit_validation"
    WORKER_MONITORING = "worker_monitoring"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EmergencyActionType(str, Enum):
    EVACUATE_AREA = "evacuate_area"
    STOP_WORK = "stop_work"
    ISOLATE_EQUIPMENT = "isolate_equipment"
    NOTIFY_SAFETY_OFFICER = "notify_safety_officer"
    NOTIFY_CONTROL_ROOM = "notify_control_room"
    NOTIFY_FIRE_TEAM = "notify_fire_team"
    NOTIFY_MEDICAL_TEAM = "notify_medical_team"
    SUSPEND_PERMIT = "suspend_permit"
    GENERATE_INCIDENT = "generate_incident"


class EmergencyCondition(str, Enum):
    """Named hazard conditions recognised by the emergency rules registry.

    Distinct from ``IncidentType``/``SensorType``: this enumerates the
    *triggering condition* vocabulary used to look up predefined emergency
    actions in :mod:`src.config.emergency_rules`, independent of how that
    condition was detected (sensor reading, permit check, worker status).
    """

    CRITICAL_GAS = "critical_gas"
    FIRE = "fire"
    EXPIRED_PERMIT = "expired_permit"
    WORKER_DOWN = "worker_down"


class ComplianceFramework(str, Enum):
    """Regulatory frameworks the Compliance Rule Engine evaluates against."""

    FACTORY_ACT = "factory_act"
    OISD = "oisd"
    DGMS = "dgms"


class ComplianceStatus(str, Enum):
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"


class RecommendationSource(str, Enum):
    """Engine that produced a recommendation, used to order results.

    Ordering follows life-safety-first triage: Emergency Response actions
    are immediate/operational, Compound Risk findings are elevated but not
    yet acted on, and Compliance violations are regulatory/administrative
    follow-up. See ``src.config.recommendation_rules`` for the configured
    priority weight of each source.
    """

    EMERGENCY_RESPONSE = "emergency_response"
    COMPOUND_RISK = "compound_risk"
    COMPLIANCE = "compliance"
