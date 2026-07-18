"""Request schemas for Computer Vision routes."""

from src.schemas.base import AppBaseModel
from src.services.computer_vision.schemas import DetectionLabel


class DetectionRequest(AppBaseModel):
    """One detected object, submitted by an inference client (edge device, batch job, or test)."""

    label: DetectionLabel
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    track_id: int | None = None


class FrameIngestRequest(AppBaseModel):
    """One video frame's worth of detections to run through the PPE Compliance Engine.

    This endpoint accepts already-computed detections rather than raw
    video/image bytes — the inference step (``CVModelPort``, e.g.
    ``UltralyticsYoloAdapter``) is expected to run at the edge or in a
    dedicated inference worker and post its output here, the same
    separation of concerns ``src.services.sensor_simulator`` uses between
    generating a reading and a route serving it.
    """

    camera_id: str
    zone: str
    frame_index: int = 0
    detections: list[DetectionRequest] = []
