"""On-demand generic object detection for a Demo Scenario Playback video.

Purely illustrative — extracts a single frame from a scenario's CCTV clip
at a given timestamp and runs it through a stock, pretrained (COCO)
Ultralytics YOLO model. This is deliberately **not** the same pipeline as
``src.services.computer_vision`` (the real PPE Compliance Engine): a COCO
checkpoint has no helmet/safety-vest/no-helmet classes, so its output
cannot honestly be mapped onto ``DetectionLabel`` or feed the compliance
engine. Detections here exist only to draw boxes over the demo video in
the UI; they are never persisted, never published to the event bus, and
never influence risk/compliance/alerts. Real PPE-driven risk continues to
come entirely from the scripted scenario timeline
(``src.services.scenario_playback.engine``).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from src.services.scenario_playback.schemas import SCENARIOS_DIR
from src.utils.logger import get_logger

logger = get_logger(__name__)

#: Directory scenario video files live in, alongside the scenario JSON files.
VIDEO_DIR: Path = SCENARIOS_DIR.parent / "data" / "cctv"

#: Stock Ultralytics checkpoint name — auto-downloaded by the `ultralytics`
#: package on first use and cached under its own model-weights directory.
#: COCO's 80 classes include "person", "car", "truck", etc., but no PPE
#: classes (see module docstring).
_COCO_MODEL_NAME = "yolov8n.pt"


@dataclass(frozen=True)
class VideoDetection:
    """One bounding-box detection from a single extracted video frame."""

    label: str
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float


class FrameExtractorPort(Protocol):
    def extract_frame(self, video_path: Path, timestamp_seconds: float) -> object | None: ...


class OpenCvFrameExtractor:
    """Extracts a single frame from a video file at a given timestamp via OpenCV."""

    def extract_frame(self, video_path: Path, timestamp_seconds: float) -> object | None:
        import cv2

        capture = cv2.VideoCapture(str(video_path))
        try:
            if not capture.isOpened():
                return None
            capture.set(cv2.CAP_PROP_POS_MSEC, max(0.0, timestamp_seconds) * 1000.0)
            success, frame = capture.read()
            return frame if success else None
        finally:
            capture.release()


class VideoObjectDetectionService:
    """Runs a stock YOLO model over one frame extracted from a scenario's video.

    Lazily constructs the ``ultralytics.YOLO`` model on first use (mirrors
    ``UltralyticsYoloAdapter``'s lazy-import pattern in
    ``src.services.computer_vision.inference``) so importing this module
    never requires the optional ``ultralytics``/``torch``/``opencv-python``
    dependencies — only actually detecting does.
    """

    def __init__(
        self,
        frame_extractor: FrameExtractorPort | None = None,
        confidence_threshold: float = 0.35,
    ) -> None:
        self._frame_extractor = frame_extractor or OpenCvFrameExtractor()
        self._confidence_threshold = confidence_threshold
        self._model = None

    def _get_model(self):
        if self._model is None:
            from ultralytics import YOLO

            self._model = YOLO(_COCO_MODEL_NAME)
        return self._model

    def detect(self, video_filename: str, timestamp_seconds: float) -> list[VideoDetection]:
        """Return every detection in the frame at ``timestamp_seconds`` of ``video_filename``.

        Returns an empty list (rather than raising) if the video file is
        missing or the requested timestamp is past the end of the clip —
        both are expected, non-error conditions for a UI poller.
        """
        video_path = VIDEO_DIR / video_filename
        if not video_path.is_file():
            logger.warning("Scenario video not found: %s", video_path)
            return []

        frame = self._frame_extractor.extract_frame(video_path, timestamp_seconds)
        if frame is None:
            return []

        model = self._get_model()
        results = model.predict(source=frame, conf=self._confidence_threshold, verbose=False)

        detections: list[VideoDetection] = []
        for result in results:
            names = result.names
            boxes = result.boxes
            if boxes is None:
                continue

            frame_height, frame_width = result.orig_shape
            for box in boxes:
                label = str(names.get(int(box.cls[0]), "object"))
                x_min, y_min, x_max, y_max = (float(v) for v in box.xyxy[0].tolist())
                detections.append(
                    VideoDetection(
                        label=label,
                        confidence=float(box.conf[0]),
                        x_min=x_min / frame_width,
                        y_min=y_min / frame_height,
                        x_max=x_max / frame_width,
                        y_max=y_max / frame_height,
                    )
                )
        return detections


_service: VideoObjectDetectionService | None = None


def get_video_object_detection_service() -> VideoObjectDetectionService:
    """Return the process-wide ``VideoObjectDetectionService`` singleton.

    Shared across requests so the YOLO model is loaded into memory once,
    not once per poll — model construction (weight loading) is expensive
    relative to running inference on a single frame.
    """
    global _service
    if _service is None:
        _service = VideoObjectDetectionService()
    return _service
