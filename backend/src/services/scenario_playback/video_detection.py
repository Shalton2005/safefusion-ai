"""On-demand industrial-safety object detection for a Demo Scenario Playback video.

Extracts a single frame from a scenario's CCTV clip at a given timestamp and
runs it through two independent, pretrained Ultralytics YOLO checkpoints —
loaded once at process startup (see ``get_video_object_detection_service``)
and reused across every poll, exactly like the single-model service this
replaces:

    - A PPE-trained checkpoint (``PPE_MODEL_PATH``, default
      ``backend/models/ppe_detection.pt`` — Hexmon/vyra-yolo-ppe-detection)
      contributing person/helmet/no_helmet/safety_vest/no_safety_vest.
    - A fire/smoke-trained checkpoint (``FIRE_SMOKE_MODEL_PATH``, default
      ``backend/models/fire_smoke_detection.pt`` — rabahdev/fire-smoke-yolov8n)
      contributing smoke/fire.

Each checkpoint's raw ``model.names`` is read dynamically at load time
(never hardcoded IDs — see ``_load_yolo_model``) and mapped onto this
service's fixed ``SAFETY_DETECTION_LABELS`` vocabulary via
``_PPE_CLASS_NAME_MAP`` / ``_FIRE_SMOKE_CLASS_NAME_MAP``. Every class outside
that vocabulary (the PPE checkpoint also has Fall-Detected/Gloves/Goggles/
Ladder/Mask/Safety-Cone classes, unrelated to this project's hazard set) is
dropped at this mapping stage, exactly like COCO's "car"/"chair"/"bottle"
were dropped when this service ran the stock COCO model — so the output
contract callers see is unchanged regardless of which checkpoint(s) produced
it. Falls back to the original stock COCO ``yolov8n.pt`` (person-only) when
either configured checkpoint path does not exist on disk, so a deployment
without the PPE/fire weights degrades gracefully instead of failing to boot.

Both models run on every frame; their detections are merged into one list
and deduplicated (same label, near-identical bounding box — see
``_deduplicate``) in case both checkpoints ever detect the same object under
overlapping vocabulary (not expected today: the two class sets are
disjoint, but the merge step is defensive against a future model swap that
overlaps them).

"Restricted Zone Entry" is not a YOLO class and never will be — it is
computed here, geometrically, from the merged detection list: every
detected person's bounding-box centroid is tested against a configured
polygon for the video's zone (``RESTRICTED_ZONES``), and a synthetic
``restricted_zone_entry`` detection is emitted when a person is inside it.

Detections here feed the CCTV overlay only — never persisted, never
published to the event bus, and never influence the PPE Compliance
Engine's risk/compliance/alerts. Real PPE-driven risk continues to come
entirely from the scripted scenario timeline
(``src.services.scenario_playback.engine``).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from src.config.settings import settings
from src.services.scenario_playback.schemas import SCENARIOS_DIR
from src.utils.logger import get_logger

logger = get_logger(__name__)

#: Directory scenario video files live in, alongside the scenario JSON files.
VIDEO_DIR: Path = SCENARIOS_DIR.parent / "data" / "cctv"

#: Stock Ultralytics checkpoint name — auto-downloaded by the `ultralytics`
#: package on first use. Fallback only: used when a configured PPE/fire
#: checkpoint path doesn't exist on disk (see ``_load_yolo_model``).
_COCO_MODEL_NAME = "yolov8n.pt"

#: The only detection labels this service will ever emit — matches the
#: industrial-safety vocabulary the CCTV overlay renders. Anything a model
#: produces outside this set is dropped at the mapping stage in
#: ``_run_model``, never returned to a caller.
SAFETY_DETECTION_LABELS: frozenset[str] = frozenset(
    {
        "person",
        "helmet_worn",
        "helmet_not_worn",
        "safety_vest",
        "no_safety_vest",
        "smoke",
        "fire",
        "restricted_zone_entry",
    }
)

#: Maps the stock COCO checkpoint's class names onto the safety vocabulary —
#: used only as the fallback model's map (see ``_load_yolo_model``). COCO
#: has no PPE/hazard classes, so only "person" maps; every other COCO class
#: is dropped.
_COCO_CLASS_NAME_MAP: dict[str, str] = {
    "person": "person",
}

#: Maps Hexmon/vyra-yolo-ppe-detection's raw ``model.names`` (14 classes) onto
#: the safety vocabulary. Matched case-insensitively against the model's
#: actual names — see ``_run_model``. Only 5 of the checkpoint's 14 classes
#: are in scope for this project; the rest (Fall-Detected, Gloves, Goggles,
#: Ladder, Mask, NO-Gloves, NO-Goggles, NO-Mask, Safety Cone) are absent from
#: this table on purpose and therefore dropped, same as any COCO noise class.
_PPE_CLASS_NAME_MAP: dict[str, str] = {
    "person": "person",
    "hardhat": "helmet_worn",
    "no-hardhat": "helmet_not_worn",
    "safety vest": "safety_vest",
    "no-safety vest": "no_safety_vest",
}

#: Maps rabahdev/fire-smoke-yolov8n's raw ``model.names`` (2 classes) onto
#: the safety vocabulary. Both classes map directly.
_FIRE_SMOKE_CLASS_NAME_MAP: dict[str, str] = {
    "smoke": "smoke",
    "fire": "fire",
}

#: Restricted-zone polygons, keyed by scenario zone name. Each polygon is a
#: sequence of (x, y) vertices in the same normalized 0-1 frame coordinates
#: as every bounding box in this codebase. One hand-configured polygon for
#: the demo's Control-Room, covering the work-area boundary visible in
#: `factory_incident.mp4` — extend with more zones as more scenario videos
#: are added.
RESTRICTED_ZONES: dict[str, tuple[tuple[float, float], ...]] = {
    "Control-Room": (
        (0.30, 0.20),
        (0.70, 0.20),
        (0.70, 0.95),
        (0.30, 0.95),
    ),
}

#: Bounding-box IoU above which two detections of the *same* mapped label
#: from *different* models are treated as duplicates of the same
#: real-world object (see ``_deduplicate``) — kept the higher-confidence
#: one only. Defensive: the PPE and fire/smoke checkpoints' vocabularies
#: are disjoint today, so this rarely fires in practice.
_DEDUPLICATION_IOU_THRESHOLD = 0.6

#: Labels that necessarily bound a person (a helmet/vest detection cannot
#: exist without a person wearing or not wearing it), used as the person
#: signal for restricted-zone centroid checks. The PPE checkpoint
#: (Hexmon/vyra-yolo-ppe-detection) frequently returns a specific PPE-item
#: box instead of — or in addition to — a bare "Person" box for the same
#: individual (observed: at the default confidence threshold, this
#: checkpoint almost never emits a bare "person" box on the demo video, only
#: PPE-item boxes), so restricted-zone entry must be computed against every
#: person-shaped box, not literally ``label == "person"`` alone, or it goes
#: silently blind whenever the model chooses the more specific label.
_PERSON_SHAPED_LABELS: frozenset[str] = frozenset(
    {"person", "helmet_worn", "helmet_not_worn", "safety_vest", "no_safety_vest"}
)

#: Horizontal centroid distance (normalized 0-1 frame width) below which two
#: person-shaped boxes (see ``_PERSON_SHAPED_LABELS``) are clustered as the
#: same individual for restricted-zone counting — e.g. one person's helmet
#: box and vest box, which sit at different heights on the same body and so
#: have near-zero bounding-box IoU (``_deduplicate`` alone would not merge
#: them) but nearly identical horizontal position. Vertical distance is not
#: used: a helmet-to-vest vertical gap is expected and can be large relative
#: to a frame's height, while two distinct people standing shoulder to
#: shoulder are reliably separated horizontally.
_PERSON_CLUSTER_X_DISTANCE = 0.08


@dataclass(frozen=True)
class VideoDetection:
    """One bounding-box detection from a single extracted video frame.

    ``label`` is always a member of ``SAFETY_DETECTION_LABELS`` — never a
    raw model class name.
    """

    label: str
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float

    @property
    def centroid(self) -> tuple[float, float]:
        return ((self.x_min + self.x_max) / 2.0, (self.y_min + self.y_max) / 2.0)

    def _iou(self, other: "VideoDetection") -> float:
        ix_min = max(self.x_min, other.x_min)
        iy_min = max(self.y_min, other.y_min)
        ix_max = min(self.x_max, other.x_max)
        iy_max = min(self.y_max, other.y_max)
        if ix_max <= ix_min or iy_max <= iy_min:
            return 0.0
        intersection = (ix_max - ix_min) * (iy_max - iy_min)
        area_self = (self.x_max - self.x_min) * (self.y_max - self.y_min)
        area_other = (other.x_max - other.x_min) * (other.y_max - other.y_min)
        union = area_self + area_other - intersection
        return intersection / union if union > 0 else 0.0


def _point_in_polygon(x: float, y: float, polygon: tuple[tuple[float, float], ...]) -> bool:
    """Ray-casting point-in-polygon test (standard even-odd rule).

    ``polygon`` is a sequence of (x, y) vertices, normalized 0-1, in either
    winding order. No external geometry dependency is worth adding for a
    single polygon test against a handful of vertices.
    """
    inside = False
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            x_intersect = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < x_intersect:
                inside = not inside
    return inside


def _cluster_person_shaped(detections: list[VideoDetection]) -> list[VideoDetection]:
    """Collapse person-shaped boxes (see ``_PERSON_SHAPED_LABELS``) that likely
    belong to the same individual into one representative box each.

    Needed because the PPE checkpoint frequently emits a separate box per
    visible PPE item (a helmet box, a vest box) rather than one bare
    "Person" box — without clustering, one real person entering the
    restricted zone would be counted, and rendered, as multiple overlapping
    ``restricted_zone_entry`` detections (see ``_PERSON_CLUSTER_X_DISTANCE``).
    Clusters by horizontal centroid proximity only, keeping the
    highest-confidence box per cluster as that cluster's representative
    position — a coarse but dependency-free grouping, consistent with
    ``PersonNearForkliftRule``'s frame-co-occurrence approximation in
    ``src.services.computer_vision.compliance_engine`` rather than real
    person tracking (no track IDs are available on this path).
    """
    clusters: list[list[VideoDetection]] = []
    for detection in sorted(detections, key=lambda d: d.confidence, reverse=True):
        cx, _ = detection.centroid
        for cluster in clusters:
            cluster_cx, _ = cluster[0].centroid
            if abs(cx - cluster_cx) <= _PERSON_CLUSTER_X_DISTANCE:
                cluster.append(detection)
                break
        else:
            clusters.append([detection])
    return [cluster[0] for cluster in clusters]


def _deduplicate(detections: list[VideoDetection]) -> list[VideoDetection]:
    """Collapse same-label, high-IoU detections (see ``_DEDUPLICATION_IOU_THRESHOLD``)
    from different models into the single highest-confidence one.

    O(n^2) over one frame's detections — always a handful of boxes, never
    worth a spatial index.
    """
    kept: list[VideoDetection] = []
    for detection in sorted(detections, key=lambda d: d.confidence, reverse=True):
        if any(
            detection.label == other.label and detection._iou(other) >= _DEDUPLICATION_IOU_THRESHOLD
            for other in kept
        ):
            continue
        kept.append(detection)
    return kept


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


@dataclass(frozen=True)
class _LoadedModel:
    """One YOLO checkpoint plus the class-name map that filters its output."""

    model: object
    class_name_map: dict[str, str]
    name: str


def _load_yolo_model(configured_path: str, class_name_map: dict[str, str], name: str) -> _LoadedModel:
    """Load one YOLO checkpoint, falling back to stock COCO if ``configured_path`` is missing.

    ``model.names`` is read dynamically off the loaded model (never a
    hardcoded ID->label table) — see ``_run_model``, which does the actual
    name lookup per detection at inference time.
    """
    from ultralytics import YOLO

    path = Path(configured_path)
    if path.is_file():
        logger.info("Loading %s checkpoint: %s", name, path)
        return _LoadedModel(model=YOLO(str(path)), class_name_map=class_name_map, name=name)

    logger.warning(
        "%s checkpoint not found at %s — falling back to stock COCO (person-only, no PPE/hazard classes).",
        name,
        path,
    )
    return _LoadedModel(model=YOLO(_COCO_MODEL_NAME), class_name_map=_COCO_CLASS_NAME_MAP, name=f"{name} (COCO fallback)")


def _run_model(loaded: _LoadedModel, frame: object, confidence_threshold: float) -> list[VideoDetection]:
    """Run one loaded model over ``frame`` and map its output onto the safety vocabulary.

    Reads ``result.names`` (the model's own dynamic class-name table) per
    detection rather than any hardcoded class-ID table, so this works
    unmodified regardless of which checkpoint ``loaded.model`` wraps or how
    its class IDs are ordered.
    """
    results = loaded.model.predict(source=frame, conf=confidence_threshold, verbose=False)

    detections: list[VideoDetection] = []
    for result in results:
        names = result.names
        boxes = result.boxes
        if boxes is None:
            continue

        frame_height, frame_width = result.orig_shape
        for box in boxes:
            raw_name = str(names.get(int(box.cls[0]), "")).strip().lower()
            safety_label = loaded.class_name_map.get(raw_name)
            if safety_label is None:
                # Not in this model's mapped vocabulary (e.g. the PPE
                # checkpoint's Fall-Detected/Gloves/Goggles/Ladder/Mask/
                # Safety Cone classes) — drop it here, at the
                # inference/output mapping stage, so it never reaches any
                # caller.
                continue

            x_min, y_min, x_max, y_max = (float(v) for v in box.xyxy[0].tolist())
            detections.append(
                VideoDetection(
                    label=safety_label,
                    confidence=float(box.conf[0]),
                    x_min=x_min / frame_width,
                    y_min=y_min / frame_height,
                    x_max=x_max / frame_width,
                    y_max=y_max / frame_height,
                )
            )
    return detections


class VideoObjectDetectionService:
    """Runs two YOLO models (PPE + fire/smoke) over one frame extracted from a
    scenario's video, merging their filtered output into the industrial-safety
    detection vocabulary.

    Both checkpoints are loaded once, lazily, on first use (mirrors
    ``UltralyticsYoloAdapter``'s lazy-import pattern in
    ``src.services.computer_vision.inference``) so importing this module
    never requires the optional ``ultralytics``/``torch``/``opencv-python``
    dependencies — only actually detecting does. Once loaded they are held
    for the lifetime of the process (see ``get_video_object_detection_service``),
    so model construction (weight loading) happens once, not once per poll.
    """

    def __init__(
        self,
        frame_extractor: FrameExtractorPort | None = None,
        confidence_threshold: float = 0.35,
        ppe_model_path: str | None = None,
        fire_smoke_model_path: str | None = None,
        restricted_zones: dict[str, tuple[tuple[float, float], ...]] | None = None,
    ) -> None:
        self._frame_extractor = frame_extractor or OpenCvFrameExtractor()
        self._confidence_threshold = confidence_threshold
        self._ppe_model_path = ppe_model_path or settings.PPE_MODEL_PATH
        self._fire_smoke_model_path = fire_smoke_model_path or settings.FIRE_SMOKE_MODEL_PATH
        self._restricted_zones = restricted_zones if restricted_zones is not None else RESTRICTED_ZONES
        self._models: list[_LoadedModel] | None = None

    def _get_models(self) -> list[_LoadedModel]:
        if self._models is None:
            self._models = [
                _load_yolo_model(self._ppe_model_path, _PPE_CLASS_NAME_MAP, name="PPE"),
                _load_yolo_model(self._fire_smoke_model_path, _FIRE_SMOKE_CLASS_NAME_MAP, name="fire/smoke"),
            ]
        return self._models

    def detect(self, video_filename: str, timestamp_seconds: float, zone: str | None = None) -> list[VideoDetection]:
        """Return every safety-relevant detection in the frame at ``timestamp_seconds``.

        Returns an empty list (rather than raising) if the video file is
        missing or the requested timestamp is past the end of the clip —
        both are expected, non-error conditions for a UI poller.

        Runs every loaded model (PPE, fire/smoke) against the same
        extracted frame, maps each model's raw output through its own
        class-name map (dropping anything outside the safety vocabulary),
        merges the results, and deduplicates near-identical boxes across
        models (see ``_deduplicate``). When ``zone`` names a configured
        restricted zone, each merged person detection's centroid is
        additionally tested against that zone's polygon, emitting a
        ``restricted_zone_entry`` detection for every person inside it.
        """
        video_path = VIDEO_DIR / video_filename
        if not video_path.is_file():
            logger.warning("Scenario video not found: %s", video_path)
            return []

        frame = self._frame_extractor.extract_frame(video_path, timestamp_seconds)
        if frame is None:
            return []

        detections: list[VideoDetection] = []
        for loaded_model in self._get_models():
            detections.extend(_run_model(loaded_model, frame, self._confidence_threshold))

        detections = _deduplicate(detections)

        polygon = self._restricted_zones.get(zone) if zone else None
        if polygon:
            person_shaped = [d for d in detections if d.label in _PERSON_SHAPED_LABELS]
            for person in _cluster_person_shaped(person_shaped):
                cx, cy = person.centroid
                if _point_in_polygon(cx, cy, polygon):
                    detections.append(
                        VideoDetection(
                            label="restricted_zone_entry",
                            confidence=person.confidence,
                            x_min=person.x_min,
                            y_min=person.y_min,
                            x_max=person.x_max,
                            y_max=person.y_max,
                        )
                    )

        return detections


_service: VideoObjectDetectionService | None = None


def get_video_object_detection_service() -> VideoObjectDetectionService:
    """Return the process-wide ``VideoObjectDetectionService`` singleton.

    Shared across requests so both YOLO models are loaded into memory once,
    at first use, not once per poll — model construction (weight loading)
    is expensive relative to running inference on a single frame.
    """
    global _service
    if _service is None:
        _service = VideoObjectDetectionService()
    return _service
