"""Demo Scenario Playback routes for SafeFusion AI API v1.

Starts/stops/inspects the Demo Scenario Playback Engine (see
``src.services.scenario_playback``), which replays a timed JSON scenario
into the live database so the dashboard's existing polling shows an
unfolding incident end to end — sensors, worker/PPE status, permit state,
incidents, compound risk, emergency response, compliance, and alerts —
without any frontend changes.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from src.schemas.base import AppBaseModel
from src.schemas.response.compound_risk import ZoneCompoundRiskResultResponse
from src.schemas.response.emergency_response import ZoneEmergencyResponseResultResponse
from src.services.scenario_playback.runner import get_scenario_playback_runner
from src.services.scenario_playback.schemas import list_available_scenarios
from src.services.scenario_playback.video_detection import get_video_object_detection_service

router: APIRouter = APIRouter(prefix="/demo", tags=["Demo Scenario Playback"])


class ScenarioStartRequest(AppBaseModel):
    """Request body for ``POST /demo/start``."""

    scenario: str
    #: When true, the scenario automatically restarts from its first row
    #: the instant it finishes, indefinitely, until ``POST /demo/stop``.
    loop: bool = False


class ScenarioListResponse(AppBaseModel):
    """Response schema for ``GET /demo/scenarios``."""

    scenarios: list[str]


class VideoDetectionResponse(AppBaseModel):
    """One industrial-safety detection (or scripted CV overlay event) for a single video frame.

    ``label`` is always one of ``video_detection.SAFETY_DETECTION_LABELS`` —
    generic object classes (car, chair, bottle, ...) are filtered out before
    this response is built and never appear here.
    """

    label: str
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float


class VideoDetectionsResponse(AppBaseModel):
    """Response schema for ``GET /demo/video-detections``."""

    detections: list[VideoDetectionResponse]


class ScenarioStatusResponse(AppBaseModel):
    """Response schema for ``GET /demo/status`` and ``POST /demo/start``."""

    running: bool
    scenario: str | None = None
    elapsed_seconds: float = 0.0
    total_seconds: float = 0.0
    current_row_index: int = -1
    current_row_label: str | None = None
    #: Public URL of the scenario's illustrative CCTV clip (served from the
    #: ``/media/cctv`` static mount in ``server.py``), or ``None`` if the
    #: scenario has no associated video. Purely visual — has no bearing on
    #: any persisted state.
    video_url: str | None = None
    compound_risk: list[ZoneCompoundRiskResultResponse] = []
    emergency_response: list[ZoneEmergencyResponseResultResponse] = []
    cv_events: list[VideoDetectionResponse] = []


def _to_status_response(running: bool) -> ScenarioStatusResponse:
    state = get_scenario_playback_runner().status()
    if state is None:
        return ScenarioStatusResponse(running=False)
    return ScenarioStatusResponse(
        running=running,
        scenario=state.scenario_name,
        elapsed_seconds=state.elapsed_seconds,
        total_seconds=state.total_seconds,
        current_row_index=state.current_row_index,
        current_row_label=state.current_row_label,
        video_url=f"/media/cctv/{state.video_filename}" if state.video_filename else None,
        compound_risk=[
            ZoneCompoundRiskResultResponse.model_validate(result, from_attributes=True)
            for result in state.compound_risk_results
        ],
        emergency_response=[
            ZoneEmergencyResponseResultResponse.model_validate(result, from_attributes=True)
            for result in state.emergency_response_results
        ],
        cv_events=[
            VideoDetectionResponse(
                label=event.label,
                confidence=event.confidence,
                x_min=event.x_min,
                y_min=event.y_min,
                x_max=event.x_max,
                y_max=event.y_max,
            )
            for event in state.cv_events
        ],
    )


@router.get(
    "/scenarios",
    summary="List available demo scenarios",
    description="Returns the stable name of every scenario timeline JSON file under backend/demo_scenarios/.",
    response_model=ScenarioListResponse,
)
def list_scenarios() -> ScenarioListResponse:
    return ScenarioListResponse(scenarios=list_available_scenarios())


@router.post(
    "/start",
    summary="Start (or restart) demo scenario playback",
    description=(
        "Loads the named scenario timeline and begins replaying it into the database, "
        "one row per second of elapsed playback time, driving the production Compound "
        "Risk / Emergency Response / Compliance / Alert Generation rule chain on every "
        "tick. Stops any scenario already playing first. Pass loop=true to automatically "
        "restart the same scenario from its first row the instant it finishes."
    ),
    response_model=ScenarioStatusResponse,
)
async def start_scenario(payload: ScenarioStartRequest) -> ScenarioStatusResponse:
    runner = get_scenario_playback_runner()
    try:
        await runner.start(payload.scenario, loop=payload.loop)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_status_response(running=True)


@router.post(
    "/stop",
    summary="Stop demo scenario playback",
    description="Cancels the currently running scenario playback, if any. Safe to call when nothing is running.",
    response_model=ScenarioStatusResponse,
)
async def stop_scenario() -> ScenarioStatusResponse:
    runner = get_scenario_playback_runner()
    await runner.stop()
    return _to_status_response(running=False)


@router.get(
    "/video-detections",
    summary="Run industrial-safety object detection on one frame of the scenario's CCTV clip",
    description=(
        "Extracts the video frame at the given timestamp and runs it through a stock, "
        "pretrained (COCO) YOLO model, filtered to the industrial-safety detection "
        "vocabulary (person, helmet worn/not worn, safety vest/no vest, smoke, fire, "
        "restricted zone entry) — generic COCO classes (car, chair, bottle, ...) are "
        "dropped before this response is built. Restricted-zone entry is computed "
        "geometrically (a detected person's centroid inside the zone's configured "
        "polygon), not a model class. Purely illustrative bounding boxes for the UI: "
        "detections here are never persisted, never published to the event bus, and "
        "never influence risk, compliance, or alerts — that continues to come "
        "entirely from the real PPE Compliance Engine (`/cameras/frames`)."
    ),
    response_model=VideoDetectionsResponse,
)
def get_video_detections(
    video: Annotated[str, Query(description="Video filename under backend/data/cctv/.")],
    t: Annotated[float, Query(ge=0, description="Timestamp in seconds to extract and detect.")],
) -> VideoDetectionsResponse:
    service = get_video_object_detection_service()
    state = get_scenario_playback_runner().status()
    zone = state.zone if state is not None else None
    detections = service.detect(video_filename=video, timestamp_seconds=t, zone=zone)
    return VideoDetectionsResponse(
        detections=[
            VideoDetectionResponse(
                label=d.label, confidence=d.confidence, x_min=d.x_min, y_min=d.y_min, x_max=d.x_max, y_max=d.y_max
            )
            for d in detections
        ]
    )


@router.get(
    "/status",
    summary="Get current demo scenario playback status",
    description=(
        "Returns whether a scenario is currently playing, how far through the timeline "
        "it is, and the most recent Compound Risk / Emergency Response results computed "
        "on the last tick."
    ),
    response_model=ScenarioStatusResponse,
)
def get_scenario_status() -> ScenarioStatusResponse:
    runner = get_scenario_playback_runner()
    return _to_status_response(running=runner.is_running)
