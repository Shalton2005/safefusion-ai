"""Response schemas for Computer Vision routes."""

from datetime import datetime
from typing import Any

from src.models.enums import SeverityLevel
from src.schemas.base import AppBaseModel
from src.services.computer_vision.schemas import DetectionLabel


class BoundingBoxResponse(AppBaseModel):
    """Normalized detection box, ``[0.0, 1.0]`` on both axes."""

    x_min: float
    y_min: float
    x_max: float
    y_max: float


class PPESafetyEventResponse(AppBaseModel):
    """One structured safety finding produced by the PPE Compliance Engine."""

    camera_id: str
    zone: str
    rule_name: str
    label: DetectionLabel
    severity: SeverityLevel
    confidence: float
    explanation: str
    evidence: dict[str, Any]
    bounding_box: BoundingBoxResponse | None = None


class FrameComplianceResultResponse(AppBaseModel):
    """Every safety event produced for one ingested frame, plus the events published to the bus."""

    camera_id: str
    zone: str
    frame_index: int
    events: list[PPESafetyEventResponse]
    published_event_count: int
    is_compliant: bool


class CameraMonitoringSummaryResponse(AppBaseModel):
    """Structured camera/PPE compliance summary across every tracked camera."""

    total_cameras: int
    counts: dict[str, int]
    events: list[dict[str, Any]]


class CameraStatusResponse(AppBaseModel):
    """One camera's status derived from its most recently recorded frame.

    Only fields the CV pipeline actually produces are exposed — no camera
    registry (name, physical location, resolution, fps) exists yet, so
    those fields are intentionally omitted rather than fabricated.
    """

    camera_id: str
    zone: str
    last_frame_index: int
    last_seen_at: datetime | None
    is_compliant: bool
    highest_severity: SeverityLevel | None
    detection_count: int


class PpeItemSeverityBreakdown(AppBaseModel):
    """Event count for one PPE rule, keyed by the rule's own label — not a per-worn-item rate.

    The compliance engine tracks rule firings (missing_helmet,
    missing_safety_vest), not a compliance percentage per PPE item type —
    that would require tracking every detected worker's full PPE state,
    which the engine does not do today.
    """

    rule_name: str
    label: DetectionLabel
    severity: SeverityLevel
    count: int


class PpeComplianceSummaryResponse(AppBaseModel):
    """Aggregated PPE compliance summary across every tracked camera's latest frame."""

    zone: str | None
    total_events: int
    counts_by_severity: dict[str, int]
    breakdown: list[PpeItemSeverityBreakdown]


class PpeViolationResponse(AppBaseModel):
    """One currently-open PPE violation event."""

    id: str
    camera_id: str
    zone: str
    rule_name: str
    label: DetectionLabel
    severity: SeverityLevel
    confidence: float
    explanation: str
    detected_at: datetime | None


class HazardDetectionResponse(AppBaseModel):
    """One hazard event (smoke/fire, forklift proximity) recorded by the CV pipeline."""

    id: str
    camera_id: str
    zone: str
    rule_name: str
    label: DetectionLabel
    severity: SeverityLevel
    confidence: float
    explanation: str
    detected_at: datetime | None


class CvTimelineEventResponse(AppBaseModel):
    """One chronological computer-vision event, across every tracked camera."""

    id: str
    camera_id: str
    zone: str
    rule_name: str
    label: DetectionLabel
    severity: SeverityLevel
    confidence: float
    explanation: str
    detected_at: datetime | None
