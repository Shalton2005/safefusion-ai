"""Data model for the Computer Vision service.

Framework- and model-independent by design, matching every other Day 13
service (``src.services.sensor_simulator``, ``src.services.event_bus``):
nothing here imports ``ultralytics``/``torch``/``cv2`` — those live only in
``src.services.computer_vision.inference``, behind the ``CVModelPort``
protocol. This module only describes the shape a detection/frame takes,
independent of which model produced it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class DetectionLabel(str, Enum):
    """Object classes the PPE Compliance Engine understands.

    Deliberately a fixed, small vocabulary rather than passing through
    whatever class names a given YOLO checkpoint happens to use — the
    inference adapter (see ``inference.py``) is responsible for mapping a
    model's raw class names onto this enum, so the compliance engine
    never depends on any one model's label set.
    """

    PERSON = "person"
    HELMET = "helmet"
    NO_HELMET = "no_helmet"
    SAFETY_VEST = "safety_vest"
    NO_SAFETY_VEST = "no_safety_vest"
    FORKLIFT = "forklift"
    SMOKE = "smoke"


@dataclass(frozen=True)
class BoundingBox:
    """Normalized detection box, ``[0.0, 1.0]`` on both axes (resolution-independent)."""

    x_min: float
    y_min: float
    x_max: float
    y_max: float

    def as_tuple(self) -> tuple[float, float, float, float]:
        """Shape expected by ``src.services.event_bus.payloads.ComputerVisionEventPayload``."""
        return (self.x_min, self.y_min, self.x_max, self.y_max)


@dataclass(frozen=True)
class Detection:
    """One detected object in a single video frame."""

    label: DetectionLabel
    confidence: float
    bounding_box: BoundingBox
    track_id: int | None = None
    """Stable identifier for this object across frames, when the model/tracker
    supports it (e.g. ByteTrack via ultralytics `.track()`). ``None`` for
    single-frame detection with no tracking."""


@dataclass(frozen=True)
class FrameDetections:
    """Every detection produced for one video frame from one camera."""

    camera_id: str
    zone: str
    detections: tuple[Detection, ...]
    frame_index: int
    captured_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def labels(self) -> set[DetectionLabel]:
        return {detection.label for detection in self.detections}
