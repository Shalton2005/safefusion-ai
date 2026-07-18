"""PPE Compliance Engine: converts raw CV detections into structured safety events.

Same configurable-rule strategy pattern as
``src.services.compound_risk.rules``/``src.services.alert_rules``: each
rule inspects one frame's ``FrameDetections`` and returns zero or more
``PPESafetyEvent``s. Purely rule-based (person/PPE-item co-occurrence and
absence checks) — no additional ML/inference happens here, only
interpretation of what the CV model already detected.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from src.models.enums import SeverityLevel
from src.services.computer_vision.compliance_schemas import FrameComplianceResult, PPESafetyEvent
from src.services.computer_vision.schemas import Detection, DetectionLabel, FrameDetections


class PPEComplianceRule(Protocol):
    """Contract implemented by every PPE compliance rule.

    A rule inspects one frame's detections and returns every safety event
    it fires for that frame — zero, one, or many (e.g. one
    ``NO_HELMET`` event per person missing a helmet).
    """

    def evaluate(self, frame: FrameDetections) -> list[PPESafetyEvent]: ...


def _count(frame: FrameDetections, label: DetectionLabel) -> int:
    return sum(1 for detection in frame.detections if detection.label == label)


def _detections_of(frame: FrameDetections, label: DetectionLabel) -> list[Detection]:
    return [detection for detection in frame.detections if detection.label == label]


class MissingHelmetRule:
    """Fires once per person-shaped gap in helmet coverage.

    Compares the count of detected ``PERSON``s against detected
    ``HELMET``s in the same frame: the model may emit an explicit
    ``NO_HELMET`` detection per person (preferred, most checkpoints
    trained on PPE datasets do this), or simply omit a ``HELMET``
    detection for an uncovered person. Handling both keeps this rule
    correct against either labeling convention without depending on
    which one a given checkpoint uses.
    """

    def __init__(self, severity: SeverityLevel = SeverityLevel.HIGH) -> None:
        self._severity = severity

    def evaluate(self, frame: FrameDetections) -> list[PPESafetyEvent]:
        explicit = _detections_of(frame, DetectionLabel.NO_HELMET)
        if explicit:
            return [
                PPESafetyEvent(
                    camera_id=frame.camera_id,
                    zone=frame.zone,
                    rule_name="missing_helmet",
                    label=DetectionLabel.NO_HELMET,
                    severity=self._severity,
                    confidence=detection.confidence,
                    explanation=f"Person detected without a helmet in zone '{frame.zone}'.",
                    bounding_box=detection.bounding_box,
                    evidence={"detection_confidence": detection.confidence},
                    captured_at=frame.captured_at,
                    track_id=detection.track_id,
                )
                for detection in explicit
            ]

        person_count = _count(frame, DetectionLabel.PERSON)
        helmet_count = _count(frame, DetectionLabel.HELMET)
        missing = person_count - helmet_count
        if missing <= 0:
            return []

        return [
            PPESafetyEvent(
                camera_id=frame.camera_id,
                zone=frame.zone,
                rule_name="missing_helmet",
                label=DetectionLabel.NO_HELMET,
                severity=self._severity,
                confidence=0.5,
                explanation=(
                    f"{person_count} person(s) detected but only {helmet_count} helmet(s) "
                    f"in zone '{frame.zone}' — inferred from count mismatch, no explicit "
                    "no-helmet detection."
                ),
                bounding_box=None,
                evidence={"person_count": person_count, "helmet_count": helmet_count},
                captured_at=frame.captured_at,
            )
            for _ in range(missing)
        ]


class MissingSafetyVestRule:
    """Fires once per person-shaped gap in safety-vest coverage. Same logic as ``MissingHelmetRule``."""

    def __init__(self, severity: SeverityLevel = SeverityLevel.MEDIUM) -> None:
        self._severity = severity

    def evaluate(self, frame: FrameDetections) -> list[PPESafetyEvent]:
        explicit = _detections_of(frame, DetectionLabel.NO_SAFETY_VEST)
        if explicit:
            return [
                PPESafetyEvent(
                    camera_id=frame.camera_id,
                    zone=frame.zone,
                    rule_name="missing_safety_vest",
                    label=DetectionLabel.NO_SAFETY_VEST,
                    severity=self._severity,
                    confidence=detection.confidence,
                    explanation=f"Person detected without a safety vest in zone '{frame.zone}'.",
                    bounding_box=detection.bounding_box,
                    evidence={"detection_confidence": detection.confidence},
                    captured_at=frame.captured_at,
                    track_id=detection.track_id,
                )
                for detection in explicit
            ]

        person_count = _count(frame, DetectionLabel.PERSON)
        vest_count = _count(frame, DetectionLabel.SAFETY_VEST)
        missing = person_count - vest_count
        if missing <= 0:
            return []

        return [
            PPESafetyEvent(
                camera_id=frame.camera_id,
                zone=frame.zone,
                rule_name="missing_safety_vest",
                label=DetectionLabel.NO_SAFETY_VEST,
                severity=self._severity,
                confidence=0.5,
                explanation=(
                    f"{person_count} person(s) detected but only {vest_count} safety vest(s) "
                    f"in zone '{frame.zone}' — inferred from count mismatch, no explicit "
                    "no-vest detection."
                ),
                bounding_box=None,
                evidence={"person_count": person_count, "vest_count": vest_count},
                captured_at=frame.captured_at,
            )
            for _ in range(missing)
        ]


class PersonNearForkliftRule:
    """Fires when a person and a forklift are both detected in the same frame.

    Proximity is approximated by frame co-occurrence rather than actual
    bounding-box distance — a coarse but dependency-free signal (no
    camera calibration/real-world distance mapping available at this
    layer). Suitable as a first-pass hazard flag; a future enhancement
    could tighten this to actual IoU/distance thresholds once camera
    calibration data exists.
    """

    def __init__(self, severity: SeverityLevel = SeverityLevel.HIGH) -> None:
        self._severity = severity

    def evaluate(self, frame: FrameDetections) -> list[PPESafetyEvent]:
        people = _detections_of(frame, DetectionLabel.PERSON)
        forklifts = _detections_of(frame, DetectionLabel.FORKLIFT)
        if not people or not forklifts:
            return []

        return [
            PPESafetyEvent(
                camera_id=frame.camera_id,
                zone=frame.zone,
                rule_name="person_near_forklift",
                label=DetectionLabel.FORKLIFT,
                severity=self._severity,
                confidence=min(forklift.confidence, max(p.confidence for p in people)),
                explanation=(
                    f"{len(people)} person(s) detected in the same frame as "
                    f"{len(forklifts)} forklift(s) in zone '{frame.zone}'."
                ),
                bounding_box=forklift.bounding_box,
                evidence={"person_count": len(people), "forklift_count": len(forklifts)},
                captured_at=frame.captured_at,
                track_id=forklift.track_id,
            )
            for forklift in forklifts
        ]


class SmokeDetectedRule:
    """Fires once per smoke/fire detection in a frame — always CRITICAL."""

    def __init__(self, severity: SeverityLevel = SeverityLevel.CRITICAL) -> None:
        self._severity = severity

    def evaluate(self, frame: FrameDetections) -> list[PPESafetyEvent]:
        return [
            PPESafetyEvent(
                camera_id=frame.camera_id,
                zone=frame.zone,
                rule_name="smoke_detected",
                label=DetectionLabel.SMOKE,
                severity=self._severity,
                confidence=detection.confidence,
                explanation=f"Smoke/fire detected in zone '{frame.zone}'.",
                bounding_box=detection.bounding_box,
                evidence={"detection_confidence": detection.confidence},
                captured_at=frame.captured_at,
                track_id=detection.track_id,
            )
            for detection in _detections_of(frame, DetectionLabel.SMOKE)
        ]


@dataclass
class PPEComplianceEngine:
    """Evaluates configured PPE compliance rules against one frame's detections."""

    rules: list[PPEComplianceRule] = field(default_factory=list)

    def evaluate(self, frame: FrameDetections) -> FrameComplianceResult:
        events: list[PPESafetyEvent] = []
        for rule in self.rules:
            events.extend(rule.evaluate(frame))

        return FrameComplianceResult(
            camera_id=frame.camera_id, zone=frame.zone, frame_index=frame.frame_index, events=tuple(events)
        )

    def evaluate_many(self, frames: list[FrameDetections]) -> list[FrameComplianceResult]:
        return [self.evaluate(frame) for frame in frames]
