"""Emergency Response routes for SafeFusion AI API v1.

Thin Route -> Service -> Repository endpoints that map Compound Risk
Engine output to predefined emergency actions (Evacuate Area, Stop Work,
Isolate Equipment, Notify Safety Officer, Notify Control Room, Generate
Incident) via configurable, threshold-based rules.
"""

from typing import Annotated

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from src.config.risk_rules import EMERGENCY_RESPONSE_RULES
from src.database.session import get_db
from src.models.enums import EmergencyActionType
from src.repositories.incident import IncidentRepository
from src.routes.monitoring import get_compound_risk_service
from src.schemas.request.emergency_response import EmergencyResponseRequest
from src.schemas.response.emergency_response import (
    EmergencyActionMatchResponse,
    EmergencyResponseResultResponse,
    ZoneEmergencyResponseResultResponse,
)
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.compound_risk.schemas import CompoundRiskRuleMatch, ZoneCompoundRiskResult
from src.services.emergency_response.emergency_response_service import EmergencyResponseService
from src.services.emergency_response.engine import EmergencyResponseEngine
from src.services.emergency_response.rules import ThresholdEmergencyResponseRule
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult

router: APIRouter = APIRouter(prefix="/emergency-response", tags=["Emergency Response"])

DbDep = Annotated[Session, Depends(get_db)]

# Maps each centralised rule name to the predefined action it dispatches.
_RULE_NAME_TO_ACTION: dict[str, EmergencyActionType] = {
    "notify_safety_officer": EmergencyActionType.NOTIFY_SAFETY_OFFICER,
    "notify_control_room": EmergencyActionType.NOTIFY_CONTROL_ROOM,
    "stop_work": EmergencyActionType.STOP_WORK,
    "isolate_equipment": EmergencyActionType.ISOLATE_EQUIPMENT,
    "evacuate_area": EmergencyActionType.EVACUATE_AREA,
    "generate_incident": EmergencyActionType.GENERATE_INCIDENT,
}


def _build_emergency_response_engine() -> EmergencyResponseEngine:
    """Build the Emergency Response Engine from the centralised rule registry."""
    rules = EMERGENCY_RESPONSE_RULES
    engine_rules = [
        ThresholdEmergencyResponseRule(
            rule_name=rule_name,
            action=_RULE_NAME_TO_ACTION[rule_name],
            threshold=rule.points,
        )
        for rule_name, rule in rules.items()
    ]
    return EmergencyResponseEngine(rules=engine_rules)


def get_emergency_response_service(db: DbDep) -> EmergencyResponseService:
    """Create the emergency response service with engine and incident repository wired in."""
    return EmergencyResponseService(
        engine=_build_emergency_response_engine(),
        incident_repository=IncidentRepository(db),
    )


EmergencyResponseServiceDep = Annotated[
    EmergencyResponseService, Depends(get_emergency_response_service)
]
CompoundRiskServiceDep = Annotated[CompoundRiskService, Depends(get_compound_risk_service)]


def _to_response(results: list[ZoneEmergencyResponseResult]) -> EmergencyResponseResultResponse:
    return EmergencyResponseResultResponse(
        zone_count=len(results),
        results=[
            ZoneEmergencyResponseResultResponse(
                zone=result.zone,
                risk_score=result.risk_score,
                risk_level=result.risk_level,
                actions=[
                    EmergencyActionMatchResponse(
                        action=match.action,
                        triggered_by_rule=match.triggered_by_rule,
                        explanation=match.explanation,
                    )
                    for match in result.actions
                ],
                explanation=result.explanation,
            )
            for result in results
        ],
    )


@router.post(
    "/evaluate",
    summary="Evaluate emergency response actions for supplied compound risk results",
    description=(
        "Accepts Compound Risk Engine output directly and maps each zone's "
        "risk conditions to predefined emergency actions using configurable "
        "threshold rules. Dispatches each resulting action; 'Generate "
        "Incident' persists a new incident record."
    ),
    response_model=EmergencyResponseResultResponse,
    response_description="Emergency response actions dispatched for each affected zone.",
)
def evaluate_emergency_response(
    payload: Annotated[
        EmergencyResponseRequest,
        Body(
            openapi_examples={
                "default": {
                    "summary": "Evaluate emergency response example",
                    "value": {
                        "zone_results": [
                            {
                                "zone": "Zone-A",
                                "risk_score": 82.5,
                                "risk_level": "critical",
                                "triggered_rules": [
                                    {
                                        "rule_name": "critical_sensor_with_worker_present",
                                        "points": 40.0,
                                        "explanation": (
                                            "Zone 'Zone-A' has 1 critical sensor reading(s) "
                                            "with 2 worker(s) currently present."
                                        ),
                                    }
                                ],
                            }
                        ]
                    },
                }
            }
        ),
    ],
    service: EmergencyResponseServiceDep,
) -> EmergencyResponseResultResponse:
    zone_results = [
        ZoneCompoundRiskResult(
            zone=zone.zone,
            risk_score=zone.risk_score,
            risk_level=zone.risk_level,
            triggered_rules=[
                CompoundRiskRuleMatch(
                    rule_name=rule.rule_name, points=rule.points, explanation=rule.explanation
                )
                for rule in zone.triggered_rules
            ],
        )
        for zone in payload.zone_results
    ]
    results = service.respond(zone_results)
    return _to_response(results)


@router.post(
    "/run",
    summary="Detect compound risks and dispatch emergency response actions",
    description=(
        "Runs the Compound Risk Engine against the latest sensor, worker, and "
        "permit monitoring outputs, then maps the resulting zone risk "
        "conditions to predefined emergency actions and dispatches them."
    ),
    response_model=EmergencyResponseResultResponse,
    response_description="Emergency response actions dispatched for each affected zone.",
)
def run_emergency_response(
    service: EmergencyResponseServiceDep,
    compound_risk_service: CompoundRiskServiceDep,
) -> EmergencyResponseResultResponse:
    zone_results = compound_risk_service.detect_compound_risks()
    results = service.respond(zone_results)
    return _to_response(results)
