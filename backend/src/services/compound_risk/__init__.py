"""Compound Risk Detection package for SafeFusion AI.

Combines sensor, worker, and permit monitoring summaries and evaluates
configurable compound rules — conditions that only matter when multiple
signals co-occur in the same zone (e.g. a critical sensor reading in a
zone with no active work permit). Purely rule-based, no AI/ML involved.
"""

from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.compound_risk.rules import (
    CompoundRiskRule,
    CompoundRiskRuleMatch,
    CriticalSensorWithoutActivePermitRule,
    CriticalSensorWithWorkerPresentRule,
    ExpiredPermitWithWorkerPresentRule,
    MultipleWarningSensorsRule,
    RestrictedZoneWithoutActivePermitRule,
)
from src.services.compound_risk.schemas import (
    CompoundRiskLevelBands,
    ZoneCompoundRiskResult,
)

__all__ = [
    "CompoundRiskService",
    "CompoundRiskRule",
    "CompoundRiskRuleMatch",
    "CriticalSensorWithoutActivePermitRule",
    "CriticalSensorWithWorkerPresentRule",
    "ExpiredPermitWithWorkerPresentRule",
    "MultipleWarningSensorsRule",
    "RestrictedZoneWithoutActivePermitRule",
    "CompoundRiskLevelBands",
    "ZoneCompoundRiskResult",
]
