"""Tests for the Unified Event Bus publisher."""

from __future__ import annotations

from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.publisher import EventPublisher
from src.services.event_bus.schemas import Event, EventSource, EventType


class TestEventPublisher:
    def test_publish_dispatches_an_event_with_the_bound_source(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.WORKER)

        publisher = EventPublisher(dispatcher, source=EventSource.WORKER)
        publisher.publish(EventType.UPDATED, payload={"status": "emergency"}, zone="Zone-G")

        assert len(received) == 1
        event = received[0]
        assert event.source is EventSource.WORKER
        assert event.event_type is EventType.UPDATED
        assert event.payload == {"status": "emergency"}
        assert event.zone == "Zone-G"

    def test_publish_returns_the_constructed_event(self) -> None:
        dispatcher = EventDispatcher()
        publisher = EventPublisher(dispatcher, source=EventSource.PERMIT)

        event = publisher.publish(EventType.CREATED)

        assert event.source is EventSource.PERMIT
        assert event.event_type is EventType.CREATED

    def test_publish_defaults_payload_to_empty_dict(self) -> None:
        dispatcher = EventDispatcher()
        publisher = EventPublisher(dispatcher, source=EventSource.MAINTENANCE)

        event = publisher.publish(EventType.CREATED)

        assert event.payload == {}

    def test_source_property_exposes_bound_source(self) -> None:
        publisher = EventPublisher(EventDispatcher(), source=EventSource.COMPUTER_VISION)
        assert publisher.source is EventSource.COMPUTER_VISION

    def test_correlation_id_is_threaded_through(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append)
        publisher = EventPublisher(dispatcher, source=EventSource.SENSOR)

        publisher.publish(EventType.THRESHOLD_CROSSED, correlation_id="trace-42")

        assert received[0].correlation_id == "trace-42"
