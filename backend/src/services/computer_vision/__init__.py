"""Computer Vision service for SafeFusion AI (Day 14).

Modular, loosely-coupled pipeline: pretrained-YOLO video inference
(``inference.py``) -> PPE compliance rules (``compliance_engine.py``) ->
Unified Event Bus (``events.py``) -> Compound Risk Engine correlation
(via ``camera_monitoring.py``'s ``camera_summary``, consumed by
``src.services.compound_risk``).

    - ``schemas.py`` — model-independent detection/frame shapes
      (``Detection``, ``FrameDetections``, ``DetectionLabel``).
    - ``inference.py`` — ``CVModelPort`` protocol plus
      ``UltralyticsYoloAdapter`` (real, pretrained YOLO) and
      ``FakeYoloAdapter`` (deterministic, dependency-free). Importing
      this module never requires ``ultralytics``/``torch``/``opencv`` —
      only constructing ``UltralyticsYoloAdapter`` does.
    - ``compliance_schemas.py`` / ``compliance_engine.py`` — the PPE
      Compliance Engine: configurable rules (missing helmet, missing
      vest, person-near-forklift, smoke) turning detections into
      severity+confidence-scored ``PPESafetyEvent``s.
    - ``events.py`` — ``CameraEventPublisher``, publishing each
      ``PPESafetyEvent`` as an ``Event`` on the Unified Event Bus via the
      existing ``ComputerVisionEventPayload``/``EventSource.COMPUTER_VISION``
      (both already reserved on Day 13).
    - ``camera_monitoring.py`` — ``CameraMonitoringService``, tracking the
      latest per-camera compliance result and exposing it via the same
      ``get_monitoring_summary() -> dict`` shape every other Day 13
      monitoring source uses, so ``CompoundRiskEngine.evaluate()`` can
      take a ``camera_summary`` alongside sensor/permit/worker/maintenance.

No module in this package touches FastAPI, SQLAlchemy, or the AI/LangGraph
layer directly — the same framework-agnostic design as
``src.services.sensor_simulator`` and ``src.services.event_bus``.
"""

from src.services.computer_vision.camera_monitoring import (
    CameraMonitoringService,
    get_default_camera_monitoring_service,
    reset_default_camera_monitoring_service,
)
from src.services.computer_vision.compliance_engine import (
    MissingHelmetRule,
    MissingSafetyVestRule,
    PersonNearForkliftRule,
    PPEComplianceEngine,
    PPEComplianceRule,
    SmokeDetectedRule,
)
from src.services.computer_vision.compliance_schemas import FrameComplianceResult, PPESafetyEvent
from src.services.computer_vision.events import CameraEventPublisher
from src.services.computer_vision.inference import (
    DEFAULT_CLASS_NAME_MAP,
    CVModelPort,
    FakeYoloAdapter,
    UltralyticsYoloAdapter,
)
from src.services.computer_vision.schemas import BoundingBox, Detection, DetectionLabel, FrameDetections

__all__ = [
    "BoundingBox",
    "Detection",
    "DetectionLabel",
    "FrameDetections",
    "CVModelPort",
    "UltralyticsYoloAdapter",
    "FakeYoloAdapter",
    "DEFAULT_CLASS_NAME_MAP",
    "PPESafetyEvent",
    "FrameComplianceResult",
    "PPEComplianceRule",
    "PPEComplianceEngine",
    "MissingHelmetRule",
    "MissingSafetyVestRule",
    "PersonNearForkliftRule",
    "SmokeDetectedRule",
    "CameraEventPublisher",
    "CameraMonitoringService",
    "get_default_camera_monitoring_service",
    "reset_default_camera_monitoring_service",
]
