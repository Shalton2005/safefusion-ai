"""Compound Risk Detection package for SafeFusion AI.

Combines sensor telemetry, worker location, permit status, an
equipment-health signal derived from maintenance history, and Computer
Vision / PPE compliance findings, and evaluates configurable compound
rules — conditions that only matter when multiple signals co-occur in the
same zone (e.g. a critical sensor reading in a zone with no active work
permit). Purely rule-based, no AI/ML involved. Every result carries
structured evidence and a confidence score alongside the risk score/level
(see ``ZoneCompoundRiskResult``/``CompoundRiskRuleMatch``).
"""

from src.services.compound_risk.compound_risk_service import (
    CameraMonitoringPort,
    CompoundRiskService,
    MaintenanceMonitoringPort,
    PermitValidationPort,
    SensorMonitoringPort,
    WorkerMonitoringPort,
)
from src.services.compound_risk.engine import CompoundRiskEngine
from src.services.compound_risk.rules import (
    CameraCriticalDetectionWithoutActivePermitRule,
    CompoundRiskRule,
    CompoundRiskRuleMatch,
    CriticalSensorNearDegradedEquipmentRule,
    CriticalSensorWithoutActivePermitRule,
    CriticalSensorWithWorkerPresentRule,
    DegradedEquipmentWithWorkerPresentRule,
    ExpiredPermitWithWorkerPresentRule,
    MultipleWarningSensorsRule,
    PPEViolationWithWorkerPresentRule,
    RestrictedZoneWithoutActivePermitRule,
)
from src.services.compound_risk.schemas import (
    DEFAULT_RULE_CONFIDENCE,
    CompoundRiskLevelBands,
    ZoneCompoundRiskResult,
)

__all__ = [
    "CompoundRiskService",
    "CompoundRiskEngine",
    "SensorMonitoringPort",
    "WorkerMonitoringPort",
    "PermitValidationPort",
    "MaintenanceMonitoringPort",
    "CameraMonitoringPort",
    "CompoundRiskRule",
    "CompoundRiskRuleMatch",
    "CriticalSensorWithoutActivePermitRule",
    "CriticalSensorWithWorkerPresentRule",
    "ExpiredPermitWithWorkerPresentRule",
    "MultipleWarningSensorsRule",
    "RestrictedZoneWithoutActivePermitRule",
    "DegradedEquipmentWithWorkerPresentRule",
    "CriticalSensorNearDegradedEquipmentRule",
    "CameraCriticalDetectionWithoutActivePermitRule",
    "PPEViolationWithWorkerPresentRule",
    "CompoundRiskLevelBands",
    "ZoneCompoundRiskResult",
    "DEFAULT_RULE_CONFIDENCE",
]
