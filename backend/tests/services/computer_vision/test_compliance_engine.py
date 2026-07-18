"""Tests for the PPE Compliance Engine."""

from __future__ import annotations

from src.models.enums import SeverityLevel
from src.services.computer_vision.compliance_engine import (
    MissingHelmetRule,
    MissingSafetyVestRule,
    PersonNearForkliftRule,
    PPEComplianceEngine,
    SmokeDetectedRule,
)
from src.services.computer_vision.schemas import BoundingBox, Detection, DetectionLabel, FrameDetections

_BOX = BoundingBox(0.1, 0.1, 0.5, 0.5)


def _frame(*detections: Detection, camera_id: str = "CAM-1", zone: str = "Zone-A", frame_index: int = 0) -> FrameDetections:
    return FrameDetections(camera_id=camera_id, zone=zone, detections=tuple(detections), frame_index=frame_index)


class TestMissingHelmetRule:
    def test_fires_on_explicit_no_helmet_detection(self) -> None:
        rule = MissingHelmetRule()
        frame = _frame(Detection(DetectionLabel.NO_HELMET, 0.9, _BOX))
        events = rule.evaluate(frame)
        assert len(events) == 1
        assert events[0].rule_name == "missing_helmet"
        assert events[0].confidence == 0.9
        assert events[0].severity == SeverityLevel.HIGH

    def test_fires_on_person_helmet_count_mismatch(self) -> None:
        rule = MissingHelmetRule()
        frame = _frame(
            Detection(DetectionLabel.PERSON, 0.9, _BOX),
            Detection(DetectionLabel.PERSON, 0.9, _BOX),
            Detection(DetectionLabel.HELMET, 0.8, _BOX),
        )
        events = rule.evaluate(frame)
        assert len(events) == 1
        assert events[0].evidence == {"person_count": 2, "helmet_count": 1}

    def test_does_not_fire_when_every_person_has_a_helmet(self) -> None:
        rule = MissingHelmetRule()
        frame = _frame(
            Detection(DetectionLabel.PERSON, 0.9, _BOX),
            Detection(DetectionLabel.HELMET, 0.8, _BOX),
        )
        assert rule.evaluate(frame) == []

    def test_no_people_produces_no_events(self) -> None:
        rule = MissingHelmetRule()
        frame = _frame(Detection(DetectionLabel.FORKLIFT, 0.9, _BOX))
        assert rule.evaluate(frame) == []


class TestMissingSafetyVestRule:
    def test_fires_on_explicit_no_vest_detection(self) -> None:
        rule = MissingSafetyVestRule()
        frame = _frame(Detection(DetectionLabel.NO_SAFETY_VEST, 0.7, _BOX))
        events = rule.evaluate(frame)
        assert len(events) == 1
        assert events[0].severity == SeverityLevel.MEDIUM

    def test_does_not_fire_when_every_person_has_a_vest(self) -> None:
        rule = MissingSafetyVestRule()
        frame = _frame(
            Detection(DetectionLabel.PERSON, 0.9, _BOX),
            Detection(DetectionLabel.SAFETY_VEST, 0.8, _BOX),
        )
        assert rule.evaluate(frame) == []


class TestPersonNearForkliftRule:
    def test_fires_when_person_and_forklift_co_occur(self) -> None:
        rule = PersonNearForkliftRule()
        frame = _frame(
            Detection(DetectionLabel.PERSON, 0.9, _BOX),
            Detection(DetectionLabel.FORKLIFT, 0.85, _BOX),
        )
        events = rule.evaluate(frame)
        assert len(events) == 1
        assert events[0].rule_name == "person_near_forklift"
        assert events[0].confidence == 0.85  # min(forklift, max(person))

    def test_does_not_fire_without_forklift(self) -> None:
        rule = PersonNearForkliftRule()
        frame = _frame(Detection(DetectionLabel.PERSON, 0.9, _BOX))
        assert rule.evaluate(frame) == []

    def test_does_not_fire_without_person(self) -> None:
        rule = PersonNearForkliftRule()
        frame = _frame(Detection(DetectionLabel.FORKLIFT, 0.9, _BOX))
        assert rule.evaluate(frame) == []


class TestSmokeDetectedRule:
    def test_fires_and_is_always_critical(self) -> None:
        rule = SmokeDetectedRule()
        frame = _frame(Detection(DetectionLabel.SMOKE, 0.6, _BOX))
        events = rule.evaluate(frame)
        assert len(events) == 1
        assert events[0].severity == SeverityLevel.CRITICAL

    def test_fires_once_per_smoke_detection(self) -> None:
        rule = SmokeDetectedRule()
        frame = _frame(
            Detection(DetectionLabel.SMOKE, 0.6, _BOX),
            Detection(DetectionLabel.SMOKE, 0.7, _BOX),
        )
        assert len(rule.evaluate(frame)) == 2


class TestPPEComplianceEngine:
    def test_evaluate_aggregates_every_rule(self) -> None:
        engine = PPEComplianceEngine(
            rules=[MissingHelmetRule(), MissingSafetyVestRule(), PersonNearForkliftRule(), SmokeDetectedRule()]
        )
        frame = _frame(
            Detection(DetectionLabel.PERSON, 0.9, _BOX),
            Detection(DetectionLabel.NO_HELMET, 0.85, _BOX),
            Detection(DetectionLabel.FORKLIFT, 0.8, _BOX),
        )
        result = engine.evaluate(frame)

        assert result.camera_id == "CAM-1"
        assert result.zone == "Zone-A"
        assert not result.is_compliant
        rule_names = {event.rule_name for event in result.events}
        assert "missing_helmet" in rule_names
        assert "person_near_forklift" in rule_names

    def test_compliant_frame_has_no_events(self) -> None:
        engine = PPEComplianceEngine(rules=[MissingHelmetRule(), SmokeDetectedRule()])
        frame = _frame(
            Detection(DetectionLabel.PERSON, 0.9, _BOX),
            Detection(DetectionLabel.HELMET, 0.8, _BOX),
        )
        result = engine.evaluate(frame)
        assert result.is_compliant
        assert result.highest_severity is None

    def test_highest_severity_picks_the_most_severe_event(self) -> None:
        engine = PPEComplianceEngine(rules=[MissingSafetyVestRule(), SmokeDetectedRule()])
        frame = _frame(
            Detection(DetectionLabel.NO_SAFETY_VEST, 0.7, _BOX),  # medium
            Detection(DetectionLabel.SMOKE, 0.6, _BOX),  # critical
        )
        result = engine.evaluate(frame)
        assert result.highest_severity == SeverityLevel.CRITICAL

    def test_evaluate_many_processes_every_frame(self) -> None:
        engine = PPEComplianceEngine(rules=[SmokeDetectedRule()])
        frames = [
            _frame(Detection(DetectionLabel.SMOKE, 0.9, _BOX), frame_index=0),
            _frame(frame_index=1),
        ]
        results = engine.evaluate_many(frames)
        assert len(results) == 2
        assert not results[0].is_compliant
        assert results[1].is_compliant
