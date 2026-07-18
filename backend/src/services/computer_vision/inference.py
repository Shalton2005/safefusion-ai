"""Video inference backends for the Computer Vision service.

``CVModelPort`` is the seam between "run a frame through a model" and
everything downstream (PPE Compliance Engine, event bus, compound risk).
Two implementations:

    - ``UltralyticsYoloAdapter`` — the real, pretrained-YOLO-backed
      implementation. Lazy-imports ``ultralytics`` inside ``__init__``
      rather than at module load time, so importing this module (or the
      package) never fails in an environment where the optional
      ``ultralytics``/``torch``/``opencv-python`` dependencies aren't
      installed — only *constructing* this specific adapter requires them.
    - ``FakeYoloAdapter`` — a deterministic, dependency-free stand-in
      that returns caller-supplied canned detections. Used by tests, demo
      scenarios, and any environment without GPU/model-weight access,
      mirroring how ``src.services.sensor_simulator`` separates
      ``DeterministicValueGenerator``/``RandomValueGenerator`` behind one
      ``ValueGeneratorPort``.

Neither implementation performs PPE-compliance reasoning — that is the
``PPEComplianceEngine``'s job (see ``compliance_engine.py``). This module's
only responsibility is "frame in, detections out."
"""

from __future__ import annotations

from typing import Protocol

from src.services.computer_vision.schemas import BoundingBox, Detection, DetectionLabel, FrameDetections


class CVModelPort(Protocol):
    """Contract every video-inference backend implements.

    A frame is passed as an opaque object (``object`` rather than a
    concrete array/tensor type) so this protocol has no hard dependency
    on numpy/opencv — only a real adapter's implementation needs to know
    the concrete frame type it accepts.
    """

    def detect(self, frame: object, camera_id: str, zone: str, frame_index: int) -> FrameDetections: ...


#: Maps a raw Ultralytics/YOLO class name to this service's fixed
#: ``DetectionLabel`` vocabulary. A checkpoint trained on a custom PPE
#: dataset (e.g. Roboflow's common "Hard Hat Workers"/PPE datasets) is
#: expected to use names close to these; extend this table rather than
#: widening ``DetectionLabel`` itself when swapping in a different
#: checkpoint with different class names.
DEFAULT_CLASS_NAME_MAP: dict[str, DetectionLabel] = {
    "person": DetectionLabel.PERSON,
    "helmet": DetectionLabel.HELMET,
    "hardhat": DetectionLabel.HELMET,
    "hard_hat": DetectionLabel.HELMET,
    "no_helmet": DetectionLabel.NO_HELMET,
    "no_hardhat": DetectionLabel.NO_HELMET,
    "no-hardhat": DetectionLabel.NO_HELMET,
    "vest": DetectionLabel.SAFETY_VEST,
    "safety_vest": DetectionLabel.SAFETY_VEST,
    "safety-vest": DetectionLabel.SAFETY_VEST,
    "no_vest": DetectionLabel.NO_SAFETY_VEST,
    "no_safety_vest": DetectionLabel.NO_SAFETY_VEST,
    "no-safety vest": DetectionLabel.NO_SAFETY_VEST,
    "forklift": DetectionLabel.FORKLIFT,
    "smoke": DetectionLabel.SMOKE,
    "fire": DetectionLabel.SMOKE,
}


class UltralyticsYoloAdapter:
    """Real video-inference backend using a pretrained Ultralytics YOLO model.

    Requires the optional ``ultralytics`` dependency (see
    ``requirements.txt``); importing this *module* never requires it —
    only instantiating this class does, so a deployment that only uses
    ``FakeYoloAdapter`` (e.g. running the demo scenarios or the test
    suite) never needs ``ultralytics``/``torch``/``opencv-python`` installed.
    """

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float = 0.4,
        class_name_map: dict[str, DetectionLabel] | None = None,
    ) -> None:
        try:
            from ultralytics import YOLO
        except ImportError as exc:  # pragma: no cover - exercised only without the optional dep
            raise ImportError(
                "UltralyticsYoloAdapter requires the optional 'ultralytics' package. "
                "Install it (see requirements.txt) or use FakeYoloAdapter instead."
            ) from exc

        self._model = YOLO(model_path)
        self._confidence_threshold = confidence_threshold
        self._class_name_map = class_name_map or DEFAULT_CLASS_NAME_MAP

    def detect(self, frame: object, camera_id: str, zone: str, frame_index: int) -> FrameDetections:
        """Run one frame through the model and adapt its output to ``FrameDetections``.

        Args:
            frame: A single video frame in whatever array format the
                underlying ``ultralytics`` model accepts (e.g. a numpy
                BGR array from OpenCV, or a file path/URL string).
        """
        results = self._model.predict(source=frame, conf=self._confidence_threshold, verbose=False)
        detections: list[Detection] = []

        for result in results:
            names = result.names
            boxes = result.boxes
            if boxes is None:
                continue

            frame_height, frame_width = result.orig_shape

            for box in boxes:
                raw_name = names.get(int(box.cls[0]), str(int(box.cls[0])))
                label = self._class_name_map.get(str(raw_name).lower())
                if label is None:
                    continue

                x_min, y_min, x_max, y_max = (float(v) for v in box.xyxy[0].tolist())
                track_id = int(box.id[0]) if getattr(box, "id", None) is not None else None

                detections.append(
                    Detection(
                        label=label,
                        confidence=float(box.conf[0]),
                        bounding_box=BoundingBox(
                            x_min=x_min / frame_width,
                            y_min=y_min / frame_height,
                            x_max=x_max / frame_width,
                            y_max=y_max / frame_height,
                        ),
                        track_id=track_id,
                    )
                )

        return FrameDetections(
            camera_id=camera_id, zone=zone, detections=tuple(detections), frame_index=frame_index
        )


class FakeYoloAdapter:
    """Deterministic, dependency-free stand-in for ``UltralyticsYoloAdapter``.

    Returns a caller-supplied, fixed sequence of ``FrameDetections`` (one
    per call to :meth:`detect`, cycling if there are more calls than
    canned frames) — no model, no randomness. Used by tests and by demo
    scenarios that need reproducible camera evidence without GPU/model
    weights, mirroring ``src.services.sensor_simulator.DeterministicValueGenerator``.
    """

    def __init__(self, canned_detections: list[tuple[DetectionLabel, float, BoundingBox]]) -> None:
        """Args:
        canned_detections: The fixed list of ``(label, confidence, bounding_box)``
            triples returned for every call to :meth:`detect`, regardless
            of the ``frame`` argument's actual content.
        """
        self._canned_detections = canned_detections

    def detect(self, frame: object, camera_id: str, zone: str, frame_index: int) -> FrameDetections:
        detections = tuple(
            Detection(label=label, confidence=confidence, bounding_box=box)
            for label, confidence, box in self._canned_detections
        )
        return FrameDetections(camera_id=camera_id, zone=zone, detections=detections, frame_index=frame_index)
