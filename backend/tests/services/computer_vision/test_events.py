"""Tests for CameraEventPublisher: PPE safety events -> Unified Event Bus."""

from __future__ import annotations

from src.models.enums import SeverityLevel
from src.services.computer_vision.compliance_schemas import FrameComplianceResult, PPESafetyEvent
from src.services.computer_vision.events import CameraEventPublisher
from src.services.computer_vision.schemas import BoundingBox, DetectionLabel
from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.publisher import EventPublisher
from src.services.event_bus.schemas import Event, EventSource, EventType


def _safety_event(severity: SeverityLevel, rule_name: str = "missing_helmet") -> PPESafetyEvent:
    return PPESafetyEvent(
        camera_id="CAM-1",
        zone="Zone-A",
        rule_name=rule_name,
        label=DetectionLabel.NO_HELMET,
        severity=severity,
        confidence=0.85,
        explanation="Person detected without a helmet.",
        bounding_box=BoundingBox(0.1, 0.1, 0.3, 0.3),
    )


class TestCameraEventPublisher:
    def test_publish_event_uses_computer_vision_source(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append)
        publisher = CameraEventPublisher(EventPublisher(dispatcher, source=EventSource.COMPUTER_VISION))

        publisher.publish_event(_safety_event(SeverityLevel.HIGH))

        assert len(received) == 1
        assert received[0].source is EventSource.COMPUTER_VISION

    def test_high_severity_uses_detected_event_type(self) -> None:
        dispatcher = EventDispatcher()
        publisher = CameraEventPublisher(EventPublisher(dispatcher, source=EventSource.COMPUTER_VISION))
        event = publisher.publish_event(_safety_event(SeverityLevel.HIGH))
        assert event.event_type is EventType.DETECTED

    def test_critical_severity_uses_threshold_crossed_event_type(self) -> None:
        dispatcher = EventDispatcher()
        publisher = CameraEventPublisher(EventPublisher(dispatcher, source=EventSource.COMPUTER_VISION))
        event = publisher.publish_event(_safety_event(SeverityLevel.CRITICAL, rule_name="smoke_detected"))
        assert event.event_type is EventType.THRESHOLD_CROSSED

    def test_payload_carries_status_matching_severity(self) -> None:
        dispatcher = EventDispatcher()
        publisher = CameraEventPublisher(EventPublisher(dispatcher, source=EventSource.COMPUTER_VISION))
        event = publisher.publish_event(_safety_event(SeverityLevel.HIGH))
        assert event.payload["status"] == "high"
        assert event.payload["camera_id"] == "CAM-1"
        assert event.payload["zone"] == "Zone-A"

    def test_payload_bounding_box_is_a_tuple(self) -> None:
        dispatcher = EventDispatcher()
        publisher = CameraEventPublisher(EventPublisher(dispatcher, source=EventSource.COMPUTER_VISION))
        event = publisher.publish_event(_safety_event(SeverityLevel.HIGH))
        assert event.payload["bounding_box"] == (0.1, 0.1, 0.3, 0.3)

    def test_publish_frame_result_publishes_every_event(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append)
        publisher = CameraEventPublisher(EventPublisher(dispatcher, source=EventSource.COMPUTER_VISION))

        result = FrameComplianceResult(
            camera_id="CAM-1",
            zone="Zone-A",
            frame_index=0,
            events=(_safety_event(SeverityLevel.HIGH), _safety_event(SeverityLevel.CRITICAL, "smoke_detected")),
        )
        published = publisher.publish_frame_result(result)

        assert len(published) == 2
        assert len(received) == 2

    def test_empty_frame_result_publishes_nothing(self) -> None:
        dispatcher = EventDispatcher()
        publisher = CameraEventPublisher(EventPublisher(dispatcher, source=EventSource.COMPUTER_VISION))
        result = FrameComplianceResult(camera_id="CAM-1", zone="Zone-A", frame_index=0, events=())
        assert publisher.publish_frame_result(result) == []
