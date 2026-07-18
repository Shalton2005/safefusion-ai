"""Builds the four rule engines used by a demo scenario run.

Each builder mirrors its production route-module counterpart field for
field (see the reference below) so a scenario is judged by the exact same
rules an operator would see from the live API — a demo is only credible if
it reflects production logic, not a simplified stand-in.

    - ``_build_compound_risk_engine``   mirrors ``src.routes.monitoring._build_compound_risk_engine``
    - ``_build_emergency_response_engine`` mirrors ``src.routes.emergency_response._build_emergency_response_engine``
    - ``_build_compliance_engine``      mirrors ``src.routes.compliance._build_compliance_engine``
    - ``_build_recommendation_engine``  mirrors ``src.routes.recommendations._build_recommendation_engine``

All four are pure rule-based engines with no DB dependency and no
randomness (see each engine's own module docstring) — constructing them
fresh every call is cheap and side-effect-free, and doing so (rather than
sharing one process-wide instance) keeps a scenario run fully isolated
from any other caller's state.
"""

from __future__ import annotations

from src.config.compliance_rules import COMPLIANCE_RULES
from src.config.risk_rules import COMPOUND_RISK_LEVEL_BANDS, COMPOUND_RISK_RULES, EMERGENCY_RESPONSE_RULES
from src.config.settings import settings
from src.models.enums import EmergencyActionType
from src.services.compliance.engine import ComplianceRuleEngine
from src.services.compliance.rules import IncidentAttributeComplianceRule
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
from src.services.emergency_response.engine import EmergencyResponseEngine
from src.services.emergency_response.rules import ThresholdEmergencyResponseRule
from src.services.recommendation.engine import RecommendationEngine
from src.services.recommendation.generators import (
    ComplianceRecommendationGenerator,
    CompoundRiskRecommendationGenerator,
    EmergencyResponseRecommendationGenerator,
)

_RULE_NAME_TO_ACTION: dict[str, EmergencyActionType] = {
    "notify_safety_officer": EmergencyActionType.NOTIFY_SAFETY_OFFICER,
    "notify_control_room": EmergencyActionType.NOTIFY_CONTROL_ROOM,
    "stop_work": EmergencyActionType.STOP_WORK,
    "isolate_equipment": EmergencyActionType.ISOLATE_EQUIPMENT,
    "evacuate_area": EmergencyActionType.EVACUATE_AREA,
    "generate_incident": EmergencyActionType.GENERATE_INCIDENT,
}


def build_compound_risk_engine(equipment_zone_map: dict[str, str] | None = None) -> CompoundRiskEngine:
    """Build the Compound Risk Engine from the centralised rule registry.

    Args:
        equipment_zone_map: Overrides the configured
            ``settings.EQUIPMENT_ZONE_MAP`` for the two equipment-health
            rules — a scenario supplies its own fixed equipment ids here
            rather than relying on the demo-data catalog being present.
    """
    rules = COMPOUND_RISK_RULES
    zone_map = equipment_zone_map if equipment_zone_map is not None else dict(settings.EQUIPMENT_ZONE_MAP)
    engine_rules: list = [
        CriticalSensorWithoutActivePermitRule(points=rules["critical_sensor_without_active_permit"].points),
        ExpiredPermitWithWorkerPresentRule(points=rules["expired_permit_with_worker_present"].points),
        CriticalSensorWithWorkerPresentRule(points=rules["critical_sensor_with_worker_present"].points),
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
            equipment_zone_map=zone_map,
        ),
        CriticalSensorNearDegradedEquipmentRule(
            points=rules["critical_sensor_near_degraded_equipment"].points,
            equipment_zone_map=zone_map,
        ),
    ]
    return CompoundRiskEngine(
        rules=engine_rules,
        level_bands=CompoundRiskLevelBands(**COMPOUND_RISK_LEVEL_BANDS),
    )


def build_emergency_response_engine() -> EmergencyResponseEngine:
    """Build the Emergency Response Engine from the centralised rule registry."""
    engine_rules = [
        ThresholdEmergencyResponseRule(
            rule_name=rule_name,
            action=_RULE_NAME_TO_ACTION[rule_name],
            threshold=rule.points,
        )
        for rule_name, rule in EMERGENCY_RESPONSE_RULES.items()
    ]
    return EmergencyResponseEngine(rules=engine_rules)


def build_compliance_engine() -> ComplianceRuleEngine:
    """Build the Compliance Rule Engine from the centralised rule registry."""
    return ComplianceRuleEngine(
        rules=[IncidentAttributeComplianceRule(config) for config in COMPLIANCE_RULES.values()],
    )


def build_recommendation_engine() -> RecommendationEngine:
    """Build the Recommendation Engine from the configured per-source generators."""
    return RecommendationEngine(
        compound_risk_generator=CompoundRiskRecommendationGenerator(),
        emergency_response_generator=EmergencyResponseRecommendationGenerator(),
        compliance_generator=ComplianceRecommendationGenerator(),
    )
