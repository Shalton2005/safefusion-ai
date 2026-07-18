"""Dataclasses produced by the PPE Compliance Engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from src.models.enums import SeverityLevel
from src.services.computer_vision.schemas import BoundingBox, DetectionLabel


@dataclass(frozen=True)
class PPESafetyEvent:
    """One structured safety finding derived from a single frame's detections.

    This is the PPE Compliance Engine's unit of output — a rule-based
    interpretation of raw detections (e.g. "a person was detected without
    a helmet"), not the detections themselves. Carries its own severity
    and confidence independent of any individual detection's confidence,
    since a finding can combine multiple detections (e.g. person +
    missing helmet + missing vest) into one assessment.
    """

    camera_id: str
    zone: str
    rule_name: str
    label: DetectionLabel
    severity: SeverityLevel
    confidence: float
    explanation: str
    bounding_box: BoundingBox | None
    evidence: dict = field(default_factory=dict)
    captured_at: datetime | None = None
    track_id: int | None = None


@dataclass(frozen=True)
class FrameComplianceResult:
    """Every safety event the PPE Compliance Engine produced for one frame."""

    camera_id: str
    zone: str
    frame_index: int
    events: tuple[PPESafetyEvent, ...]

    @property
    def is_compliant(self) -> bool:
        """``True`` when this frame produced no safety events at all."""
        return len(self.events) == 0

    @property
    def highest_severity(self) -> SeverityLevel | None:
        """The most severe event's severity, or ``None`` if the frame is compliant."""
        if not self.events:
            return None
        order = {SeverityLevel.LOW: 0, SeverityLevel.MEDIUM: 1, SeverityLevel.HIGH: 2, SeverityLevel.CRITICAL: 3}
        return max((event.severity for event in self.events), key=lambda level: order[level])
