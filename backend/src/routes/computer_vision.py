"""Computer Vision / PPE Compliance routes for SafeFusion AI API v1.

Thin Route -> Service wrapper around ``src.services.computer_vision`` —
this module owns request parsing and response serialization only. All
detection interpretation lives in the PPE Compliance Engine, and all
event publishing lives in ``CameraEventPublisher``, both of which have no
FastAPI dependency and are reusable from a script, a WebSocket route, a
live inference worker, or a test without going through HTTP at all.

Accepts already-computed detections (see
``src.schemas.request.computer_vision.FrameIngestRequest``) rather than
raw video/image bytes: the YOLO inference step is expected to run at the
edge or in a dedicated worker process (see
``src.services.computer_vision.inference.UltralyticsYoloAdapter``) and
post its output here — the same separation the Sensor Simulator routes
use between value generation and HTTP serving.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.models.enums import SeverityLevel
from src.schemas.request.computer_vision import FrameIngestRequest
from src.schemas.response.computer_vision import (
    BoundingBoxResponse,
    CameraMonitoringSummaryResponse,
    CameraStatusResponse,
    CvTimelineEventResponse,
    FrameComplianceResultResponse,
    HazardDetectionResponse,
    PPESafetyEventResponse,
    PpeComplianceSummaryResponse,
    PpeItemSeverityBreakdown,
    PpeViolationResponse,
)
from src.services.computer_vision import (
    BoundingBox,
    CameraEventPublisher,
    CameraMonitoringService,
    Detection,
    FrameDetections,
    MissingHelmetRule,
    MissingSafetyVestRule,
    PersonNearForkliftRule,
    PPEComplianceEngine,
    PPESafetyEvent,
    SmokeDetectedRule,
    get_default_camera_monitoring_service,
)
from src.services.event_bus.bus import get_default_dispatcher
from src.services.event_bus.publisher import EventPublisher
from src.services.event_bus.schemas import EventSource

router: APIRouter = APIRouter(prefix="/cameras", tags=["Computer Vision"])


def _build_ppe_compliance_engine() -> PPEComplianceEngine:
    """Build the PPE Compliance Engine with its default rule set.

    Each rule carries its own fixed default ``SeverityLevel`` (see
    ``src.services.computer_vision.compliance_engine``) rather than a
    configurable point value — PPE findings map directly to a severity,
    unlike the point-accumulating Compound Risk Engine rules.
    """
    return PPEComplianceEngine(
        rules=[
            MissingHelmetRule(),
            MissingSafetyVestRule(),
            PersonNearForkliftRule(),
            SmokeDetectedRule(),
        ]
    )


def get_ppe_compliance_engine() -> PPEComplianceEngine:
    return _build_ppe_compliance_engine()


def get_camera_event_publisher() -> CameraEventPublisher:
    """Publish through the process-wide event bus dispatcher (see ``src.services.event_bus.bus``)."""
    return CameraEventPublisher(EventPublisher(get_default_dispatcher(), source=EventSource.COMPUTER_VISION))


def get_camera_monitoring_service() -> CameraMonitoringService:
    return get_default_camera_monitoring_service()


PPEComplianceEngineDep = Annotated[PPEComplianceEngine, Depends(get_ppe_compliance_engine)]
CameraEventPublisherDep = Annotated[CameraEventPublisher, Depends(get_camera_event_publisher)]
CameraMonitoringServiceDep = Annotated[CameraMonitoringService, Depends(get_camera_monitoring_service)]


def _to_ppe_safety_event_response(event: PPESafetyEvent) -> PPESafetyEventResponse:
    """Build the response schema for one ``PPESafetyEvent``, including its bounding box when present."""
    return PPESafetyEventResponse(
        camera_id=event.camera_id,
        zone=event.zone,
        rule_name=event.rule_name,
        label=event.label,
        severity=event.severity,
        confidence=event.confidence,
        explanation=event.explanation,
        evidence=event.evidence,
        bounding_box=(
            BoundingBoxResponse(
                x_min=event.bounding_box.x_min,
                y_min=event.bounding_box.y_min,
                x_max=event.bounding_box.x_max,
                y_max=event.bounding_box.y_max,
            )
            if event.bounding_box is not None
            else None
        ),
    )


@router.post(
    "/frames",
    summary="Ingest one frame's detections and run the PPE Compliance Engine",
    description=(
        "Accepts pre-computed video-inference detections for one camera frame, runs them "
        "through the configurable PPE Compliance Engine (missing helmet, missing safety "
        "vest, person-near-forklift, smoke), publishes every resulting safety event onto "
        "the Unified Event Bus, and records the result for compound-risk correlation."
    ),
    response_model=FrameComplianceResultResponse,
    response_description="Every PPE safety event produced for this frame.",
)
def ingest_frame(
    request: FrameIngestRequest,
    engine: PPEComplianceEngineDep,
    publisher: CameraEventPublisherDep,
    camera_service: CameraMonitoringServiceDep,
) -> FrameComplianceResultResponse:
    frame = FrameDetections(
        camera_id=request.camera_id,
        zone=request.zone,
        frame_index=request.frame_index,
        detections=tuple(
            Detection(
                label=detection.label,
                confidence=detection.confidence,
                bounding_box=BoundingBox(
                    x_min=detection.x_min, y_min=detection.y_min, x_max=detection.x_max, y_max=detection.y_max
                ),
                track_id=detection.track_id,
            )
            for detection in request.detections
        ),
    )

    result = engine.evaluate(frame)
    published = publisher.publish_frame_result(result)
    camera_service.record(result)

    return FrameComplianceResultResponse(
        camera_id=result.camera_id,
        zone=result.zone,
        frame_index=result.frame_index,
        events=[_to_ppe_safety_event_response(event) for event in result.events],
        published_event_count=len(published),
        is_compliant=result.is_compliant,
    )


@router.get(
    "/summary",
    summary="Get camera / PPE compliance monitoring summary",
    description=(
        "Returns the latest recorded PPE compliance result per camera, aggregated the same "
        "way sensor/permit/worker/maintenance monitoring summaries are, for compound-risk "
        "correlation and dashboard display."
    ),
    response_model=CameraMonitoringSummaryResponse,
    response_description="Structured camera monitoring summary.",
)
def get_camera_summary(camera_service: CameraMonitoringServiceDep) -> CameraMonitoringSummaryResponse:
    return CameraMonitoringSummaryResponse.model_validate(camera_service.get_monitoring_summary())


# ── Hazard rule names the SmokeDetectedRule / PersonNearForkliftRule can produce ──
_HAZARD_RULE_NAMES = {"smoke_detected", "person_near_forklift"}


def _event_id(camera_id: str, rule_name: str, index: int) -> str:
    return f"{camera_id}:{rule_name}:{index}"


@router.get(
    "",
    summary="List cameras with a recorded frame",
    description=(
        "Returns one entry per camera that has had at least one frame ingested via "
        "`POST /cameras/frames`, derived from its most recently recorded compliance "
        "result. Cameras with no ingested frames yet are not listed — there is no "
        "separate camera registry."
    ),
    response_model=list[CameraStatusResponse],
    response_description="Cameras with a recorded frame, most recently updated first.",
)
def list_cameras(
    camera_service: CameraMonitoringServiceDep,
    zone: Annotated[str | None, Query(description="Restrict results to a single zone.")] = None,
) -> list[CameraStatusResponse]:
    results = camera_service.get_latest_by_camera().values()
    if zone is not None:
        results = [result for result in results if result.zone == zone]

    cameras = [
        CameraStatusResponse(
            camera_id=result.camera_id,
            zone=result.zone,
            last_frame_index=result.frame_index,
            last_seen_at=result.events[0].captured_at if result.events else None,
            is_compliant=result.is_compliant,
            highest_severity=result.highest_severity,
            detection_count=len(result.events),
        )
        for result in results
    ]
    return sorted(cameras, key=lambda camera: camera.camera_id)


@router.get(
    "/{camera_id}/detections",
    summary="Get a camera's most recently recorded safety events",
    description="Returns every PPE safety event from the given camera's most recently ingested frame.",
    response_model=list[PPESafetyEventResponse],
    response_description="Safety events from the camera's latest recorded frame.",
)
def get_camera_detections(
    camera_id: str,
    camera_service: CameraMonitoringServiceDep,
) -> list[PPESafetyEventResponse]:
    result = camera_service.get_latest_by_camera().get(camera_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No recorded frame for this camera.")

    return [_to_ppe_safety_event_response(event) for event in result.events]


@router.get(
    "/ppe",
    summary="Get aggregated PPE compliance summary",
    description=(
        "Aggregates every recorded PPE rule event (missing helmet, missing safety vest) "
        "across cameras' latest frames by severity and rule. There is no per-PPE-item "
        "compliance rate — the engine tracks rule firings, not per-worker PPE state."
    ),
    response_model=PpeComplianceSummaryResponse,
    response_description="PPE compliance summary, optionally scoped to a zone.",
)
def get_ppe_compliance_summary(
    camera_service: CameraMonitoringServiceDep,
    zone: Annotated[str | None, Query(description="Restrict results to a single zone.")] = None,
) -> PpeComplianceSummaryResponse:
    breakdown_counts: dict[tuple[str, str, str], int] = {}
    counts_by_severity = {level.value: 0 for level in SeverityLevel}
    total_events = 0

    for result in camera_service.get_latest_by_camera().values():
        if zone is not None and result.zone != zone:
            continue
        for event in result.events:
            if event.rule_name not in {"missing_helmet", "missing_safety_vest"}:
                continue
            key = (event.rule_name, event.label.value, event.severity.value)
            breakdown_counts[key] = breakdown_counts.get(key, 0) + 1
            counts_by_severity[event.severity.value] += 1
            total_events += 1

    breakdown = [
        PpeItemSeverityBreakdown(rule_name=rule_name, label=label, severity=severity, count=count)
        for (rule_name, label, severity), count in breakdown_counts.items()
    ]

    return PpeComplianceSummaryResponse(
        zone=zone,
        total_events=total_events,
        counts_by_severity=counts_by_severity,
        breakdown=breakdown,
    )


@router.get(
    "/ppe/violations",
    summary="List currently-open PPE violations",
    description="Returns every missing-helmet/missing-safety-vest event from cameras' latest frames, most recent first.",
    response_model=list[PpeViolationResponse],
    response_description="Currently-open PPE violations.",
)
def get_ppe_violations(
    camera_service: CameraMonitoringServiceDep,
    zone: Annotated[str | None, Query(description="Restrict results to a single zone.")] = None,
) -> list[PpeViolationResponse]:
    violations: list[PpeViolationResponse] = []
    for result in camera_service.get_latest_by_camera().values():
        if zone is not None and result.zone != zone:
            continue
        for index, event in enumerate(result.events):
            if event.rule_name not in {"missing_helmet", "missing_safety_vest"}:
                continue
            violations.append(
                PpeViolationResponse(
                    id=_event_id(result.camera_id, event.rule_name, index),
                    camera_id=event.camera_id,
                    zone=event.zone,
                    rule_name=event.rule_name,
                    label=event.label,
                    severity=event.severity,
                    confidence=event.confidence,
                    explanation=event.explanation,
                    detected_at=event.captured_at,
                )
            )

    violations.sort(key=lambda violation: violation.detected_at or datetime.min, reverse=True)
    return violations


@router.get(
    "/hazards",
    summary="List recorded hazard detections",
    description="Returns every smoke/fire and person-near-forklift event from cameras' latest frames, most recent first.",
    response_model=list[HazardDetectionResponse],
    response_description="Recorded hazard detections.",
)
def get_hazard_detections(
    camera_service: CameraMonitoringServiceDep,
    zone: Annotated[str | None, Query(description="Restrict results to a single zone.")] = None,
) -> list[HazardDetectionResponse]:
    hazards: list[HazardDetectionResponse] = []
    for result in camera_service.get_latest_by_camera().values():
        if zone is not None and result.zone != zone:
            continue
        for index, event in enumerate(result.events):
            if event.rule_name not in _HAZARD_RULE_NAMES:
                continue
            hazards.append(
                HazardDetectionResponse(
                    id=_event_id(result.camera_id, event.rule_name, index),
                    camera_id=event.camera_id,
                    zone=event.zone,
                    rule_name=event.rule_name,
                    label=event.label,
                    severity=event.severity,
                    confidence=event.confidence,
                    explanation=event.explanation,
                    detected_at=event.captured_at,
                )
            )

    hazards.sort(key=lambda hazard: hazard.detected_at or datetime.min, reverse=True)
    return hazards


@router.get(
    "/timeline",
    summary="Get the chronological computer-vision event feed",
    description="Returns every recorded safety event across every camera's latest frame, most recent first.",
    response_model=list[CvTimelineEventResponse],
    response_description="Chronological computer-vision events.",
)
def get_cv_timeline(
    camera_service: CameraMonitoringServiceDep,
    zone: Annotated[str | None, Query(description="Restrict results to a single zone.")] = None,
) -> list[CvTimelineEventResponse]:
    events: list[CvTimelineEventResponse] = []
    for result in camera_service.get_latest_by_camera().values():
        if zone is not None and result.zone != zone:
            continue
        for index, event in enumerate(result.events):
            events.append(
                CvTimelineEventResponse(
                    id=_event_id(result.camera_id, event.rule_name, index),
                    camera_id=event.camera_id,
                    zone=event.zone,
                    rule_name=event.rule_name,
                    label=event.label,
                    severity=event.severity,
                    confidence=event.confidence,
                    explanation=event.explanation,
                    detected_at=event.captured_at,
                )
            )

    events.sort(key=lambda event: event.detected_at or datetime.min, reverse=True)
    return events
