"""Response schemas for Computer Vision routes."""

from typing import Any

from src.models.enums import SeverityLevel
from src.schemas.base import AppBaseModel
from src.services.computer_vision.schemas import DetectionLabel


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
