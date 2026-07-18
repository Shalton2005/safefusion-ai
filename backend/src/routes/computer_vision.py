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

from typing import Annotated

from fastapi import APIRouter, Depends

from src.schemas.request.computer_vision import FrameIngestRequest
from src.schemas.response.computer_vision import (
    CameraMonitoringSummaryResponse,
    FrameComplianceResultResponse,
    PPESafetyEventResponse,
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
        events=[
            PPESafetyEventResponse(
                camera_id=event.camera_id,
                zone=event.zone,
                rule_name=event.rule_name,
                label=event.label,
                severity=event.severity,
                confidence=event.confidence,
                explanation=event.explanation,
                evidence=event.evidence,
            )
            for event in result.events
        ],
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
