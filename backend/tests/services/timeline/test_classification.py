"""Tests for severity and AI-decision-reference classification of published events."""

from __future__ import annotations

from src.models.enums import SeverityLevel
from src.services.event_bus.schemas import Event, EventSource, EventType
from src.services.timeline.classification import classify_severity, extract_ai_decision_reference


def _event(event_type: EventType = EventType.CREATED, payload: dict | None = None) -> Event:
    return Event(source=EventSource.SENSOR, event_type=event_type, payload=payload or {})


class TestClassifySeverity:
    def test_normal_status_is_low(self) -> None:
        assert classify_severity(_event(payload={"status": "normal"})) == SeverityLevel.LOW

    def test_warning_status_is_medium(self) -> None:
        assert classify_severity(_event(payload={"status": "warning"})) == SeverityLevel.MEDIUM

    def test_critical_status_is_critical(self) -> None:
        assert classify_severity(_event(payload={"status": "critical"})) == SeverityLevel.CRITICAL

    def test_worker_emergency_status_is_critical(self) -> None:
        assert classify_severity(_event(payload={"status": "emergency"})) == SeverityLevel.CRITICAL

    def test_expired_permit_status_is_high(self) -> None:
        assert classify_severity(_event(payload={"status": "expired"})) == SeverityLevel.HIGH

    def test_degraded_equipment_status_is_high(self) -> None:
        assert classify_severity(_event(payload={"status": "degraded"})) == SeverityLevel.HIGH

    def test_missing_status_falls_back_to_event_type_minimum(self) -> None:
        assert classify_severity(_event(EventType.CREATED, payload={})) == SeverityLevel.LOW

    def test_unrecognized_status_falls_back_to_event_type_minimum(self) -> None:
        assert classify_severity(_event(EventType.CREATED, payload={"status": "unknown_value"})) == SeverityLevel.LOW

    def test_deleted_event_type_has_medium_floor_even_without_status(self) -> None:
        assert classify_severity(_event(EventType.DELETED, payload={})) == SeverityLevel.MEDIUM

    def test_threshold_crossed_event_type_has_high_floor(self) -> None:
        assert classify_severity(_event(EventType.THRESHOLD_CROSSED, payload={})) == SeverityLevel.HIGH

    def test_low_status_does_not_downgrade_a_higher_event_type_floor(self) -> None:
        event = _event(EventType.THRESHOLD_CROSSED, payload={"status": "normal"})
        assert classify_severity(event) == SeverityLevel.HIGH

    def test_high_status_overrides_a_lower_event_type_floor(self) -> None:
        event = _event(EventType.CREATED, payload={"status": "critical"})
        assert classify_severity(event) == SeverityLevel.CRITICAL

    def test_non_string_status_is_ignored(self) -> None:
        event = _event(EventType.CREATED, payload={"status": 123})
        assert classify_severity(event) == SeverityLevel.LOW


class TestExtractAiDecisionReference:
    def test_explicit_ai_decision_reference_is_used(self) -> None:
        event = _event(payload={"ai_decision_reference": "rec-42"})
        assert extract_ai_decision_reference(event) == "rec-42"

    def test_recommendation_reason_is_used_as_fallback(self) -> None:
        event = _event(payload={"recommendation_reason": "critical_sensor_without_active_permit"})
        assert extract_ai_decision_reference(event) == "critical_sensor_without_active_permit"

    def test_explicit_reference_takes_priority_over_recommendation_reason(self) -> None:
        event = _event(
            payload={"ai_decision_reference": "rec-1", "recommendation_reason": "some_rule"}
        )
        assert extract_ai_decision_reference(event) == "rec-1"

    def test_no_reference_present_returns_none(self) -> None:
        assert extract_ai_decision_reference(_event(payload={})) is None

    def test_empty_string_reference_is_treated_as_absent(self) -> None:
        assert extract_ai_decision_reference(_event(payload={"ai_decision_reference": ""})) is None

    def test_non_string_reference_is_ignored(self) -> None:
        assert extract_ai_decision_reference(_event(payload={"ai_decision_reference": 42})) is None
