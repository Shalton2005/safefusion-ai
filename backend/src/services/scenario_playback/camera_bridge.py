"""Bridges Demo Scenario Playback's video detections into the real Computer
Vision / PPE Compliance pipeline.

Before this module existed, ``video_detection.py``'s dual-model (PPE +
fire/smoke) output only ever fed the CCTV overlay UI (``ScenarioVideoPanel``)
— it never reached ``CameraMonitoringService``, so the real ``/cameras/*``
routes (Live Camera Grid, PPE Compliance, Hazard Detection, AI Timeline) and
the Compound Risk Engine's camera-based rules
(``CameraCriticalDetectionWithoutActivePermitRule``/
``PPEViolationWithWorkerPresentRule``) stayed permanently empty/unfired
during scenario playback, even though real PPE/fire/smoke detections were
being computed the whole time. This module closes that gap: it converts one
``video_detection.detect()`` call's output into the same
``FrameDetections``/``PPEComplianceEngine`` pipeline
``POST /cameras/frames`` uses, so scenario playback now populates exactly
what a live camera feed would.

Deliberately NOT called on every 1-second scenario tick — dual-model YOLO
inference costs ~1.7s/frame on CPU (see
``src.services.scenario_playback.runner``'s tick loop, which needs to stay
fast and never block on this), so ``ScenarioPlaybackRunner`` calls
:func:`run_camera_detection_tick` on its own slower, throttled cadence
(``CAMERA_DETECTION_INTERVAL_SECONDS``) via ``asyncio.to_thread`` so
inference never blocks the event loop or other requests.

"restricted_zone_entry" is intentionally NOT translated into a
``DetectionLabel``/PPE finding here — it has no PPE-compliance meaning (it's
not a missing-safety-item finding) and the Compound Risk Engine already has
a dedicated, unrelated restricted-zone signal
(``RestrictedZoneWithoutActivePermitRule``, driven by worker/permit DB
state, not camera detections). Feeding it through the PPE pipeline would
double up two conceptually different "restricted zone" signals.
"""

from __future__ import annotations

from src.services.computer_vision.camera_monitoring import CameraMonitoringService
from src.services.computer_vision.compliance_engine import PPEComplianceEngine
from src.services.computer_vision.schemas import BoundingBox, Detection, DetectionLabel, FrameDetections
from src.services.scenario_playback.video_detection import VideoDetection, VideoObjectDetectionService
from src.utils.logger import get_logger

logger = get_logger(__name__)

#: How often (in seconds) scenario playback runs real dual-model detection
#: and records it into the live Camera Monitoring pipeline. Independent of
#: the 1-second scenario tick — see module docstring.
CAMERA_DETECTION_INTERVAL_SECONDS: float = 3.0

#: Maps ``video_detection``'s safety-overlay vocabulary onto the PPE
#: Compliance Engine's ``DetectionLabel`` enum. "restricted_zone_entry" is
#: intentionally absent (see module docstring) and therefore dropped, same
#: as any other out-of-scope label elsewhere in this codebase.
_VIDEO_LABEL_TO_DETECTION_LABEL: dict[str, DetectionLabel] = {
    "person": DetectionLabel.PERSON,
    "helmet_worn": DetectionLabel.HELMET,
    "helmet_not_worn": DetectionLabel.NO_HELMET,
    "safety_vest": DetectionLabel.SAFETY_VEST,
    "no_safety_vest": DetectionLabel.NO_SAFETY_VEST,
    "smoke": DetectionLabel.SMOKE,
    "fire": DetectionLabel.SMOKE,
}


def _to_frame_detections(
    video_detections: list[VideoDetection], camera_id: str, zone: str, frame_index: int
) -> FrameDetections:
    detections: list[Detection] = []
    for video_detection in video_detections:
        label = _VIDEO_LABEL_TO_DETECTION_LABEL.get(video_detection.label)
        if label is None:
            continue
        detections.append(
            Detection(
                label=label,
                confidence=video_detection.confidence,
                bounding_box=BoundingBox(
                    x_min=video_detection.x_min,
                    y_min=video_detection.y_min,
                    x_max=video_detection.x_max,
                    y_max=video_detection.y_max,
                ),
            )
        )
    return FrameDetections(camera_id=camera_id, zone=zone, detections=tuple(detections), frame_index=frame_index)


def run_camera_detection_tick(
    detection_service: VideoObjectDetectionService,
    compliance_engine: PPEComplianceEngine,
    camera_monitoring: CameraMonitoringService,
    video_filename: str,
    timestamp_seconds: float,
    camera_id: str,
    zone: str,
    frame_index: int,
) -> None:
    """Run one dual-model detection pass and record its PPE compliance result.

    Synchronous and CPU-bound (YOLO inference) — callers on the asyncio
    event loop (``ScenarioPlaybackRunner``) must run this via
    ``asyncio.to_thread`` rather than awaiting it directly, or it will
    block every other request for the ~1.7s this takes.
    """
    video_detections = detection_service.detect(
        video_filename=video_filename, timestamp_seconds=timestamp_seconds, zone=zone
    )
    frame = _to_frame_detections(video_detections, camera_id=camera_id, zone=zone, frame_index=frame_index)
    result = compliance_engine.evaluate(frame)
    camera_monitoring.record(result)
