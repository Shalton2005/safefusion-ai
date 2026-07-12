"""Emergency Response package for SafeFusion AI.

Maps Compound Risk Engine output to predefined emergency actions
(Evacuate Area, Stop Work, Isolate Equipment, Notify Safety Officer,
Notify Control Room, Generate Incident) via configurable, threshold-based
rules. Purely rule-based, no AI/ML involved.
"""

from src.services.emergency_response.emergency_response_service import EmergencyResponseService
from src.services.emergency_response.engine import EmergencyResponseEngine
from src.services.emergency_response.rules import (
    EmergencyResponseRule,
    ThresholdEmergencyResponseRule,
)
from src.services.emergency_response.schemas import (
    EmergencyActionMatch,
    ZoneEmergencyResponseResult,
)

__all__ = [
    "EmergencyResponseService",
    "EmergencyResponseEngine",
    "EmergencyResponseRule",
    "ThresholdEmergencyResponseRule",
    "EmergencyActionMatch",
    "ZoneEmergencyResponseResult",
]
