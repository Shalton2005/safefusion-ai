"""Emergency status/actions routes for SafeFusion AI API v1.

Thin, read-only GET endpoints over the existing Compound Risk and
Emergency Response services (``src.routes.monitoring``,
``src.routes.emergency_response``): both endpoints run the same
detect-then-evaluate pass and simply project a different subset of the
result — ``/emergency/status`` is a quick per-zone risk snapshot,
``/emergency/actions`` is the full list of matched actions. Uses
``EmergencyResponseService.evaluate()`` (not ``respond()``) since these
are read-only views — dispatching/persisting an action here would fire on
every poll of a plain GET. Only ``POST /emergency-response/run`` and
``POST /emergency-response/evaluate`` are meant to actually dispatch.
"""

from fastapi import APIRouter

from src.routes.emergency_response import EmergencyResponseServiceDep
from src.routes.monitoring import CompoundRiskServiceDep
from src.schemas.response.emergency_response import (
    EmergencyActionMatchResponse,
    EmergencyResponseResultResponse,
    ZoneEmergencyResponseResultResponse,
)
from src.schemas.response.emergency_status import EmergencyStatusResponse, ZoneEmergencyStatusResponse
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.emergency_response.emergency_response_service import EmergencyResponseService
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult

router: APIRouter = APIRouter(prefix="/emergency", tags=["Emergency"])


def _evaluate(
    compound_risk_service: CompoundRiskService,
    emergency_response_service: EmergencyResponseService,
) -> list[ZoneEmergencyResponseResult]:
    zone_results = compound_risk_service.detect_compound_risks()
    return emergency_response_service.evaluate(zone_results)


@router.get(
    "/status",
    summary="Get plant-wide emergency status",
    description=(
        "Runs the Compound Risk and Emergency Response engines and returns "
        "a per-zone risk snapshot (score, level, dispatched action count) "
        "without the full action detail. Use /emergency/actions for the "
        "full dispatched-action list."
    ),
    response_model=EmergencyStatusResponse,
    response_description="Plant-wide emergency status snapshot.",
)
def get_emergency_status(
    compound_risk_service: CompoundRiskServiceDep,
    emergency_response_service: EmergencyResponseServiceDep,
) -> EmergencyStatusResponse:
    results = _evaluate(compound_risk_service, emergency_response_service)
    zones = [
        ZoneEmergencyStatusResponse(
            zone=result.zone,
            risk_score=result.risk_score,
            risk_level=result.risk_level,
            action_count=len(result.actions),
        )
        for result in results
    ]
    return EmergencyStatusResponse(
        zone_count=len(zones),
        # True only when at least one zone has matched emergency-response
        # rules (i.e. its risk score cleared a dispatch threshold) — not
        # merely when compound risk zones exist.  The previous
        # ``len(zones) > 0`` made Emergency Mode permanently Active from
        # the moment any compound risk fired, even at low/medium levels
        # with zero dispatched actions.
        in_emergency=any(z.action_count > 0 for z in zones),
        zones=zones,
    )


@router.get(
    "/actions",
    summary="Get dispatched emergency actions",
    description=(
        "Runs the Compound Risk and Emergency Response engines and returns "
        "the full list of dispatched emergency actions per zone (Evacuate "
        "Area, Stop Work, Isolate Equipment, Notify Safety Officer, Notify "
        "Control Room, Generate Incident)."
    ),
    response_model=EmergencyResponseResultResponse,
    response_description="Dispatched emergency actions for each affected zone.",
)
def get_emergency_actions(
    compound_risk_service: CompoundRiskServiceDep,
    emergency_response_service: EmergencyResponseServiceDep,
) -> EmergencyResponseResultResponse:
    results = _evaluate(compound_risk_service, emergency_response_service)
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
