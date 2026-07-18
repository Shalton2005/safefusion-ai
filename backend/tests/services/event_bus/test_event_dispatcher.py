"""Tests for the Unified Event Bus dispatcher."""

from __future__ import annotations

from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.schemas import Event, EventSource, EventType


def _event(source: EventSource = EventSource.SENSOR, event_type: EventType = EventType.CREATED, **kwargs) -> Event:
    return Event(source=source, event_type=event_type, **kwargs)


class TestExactSubscription:
    def test_handler_receives_matching_event(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.SENSOR, event_type=EventType.CREATED)

        event = _event()
        dispatcher.dispatch(event)

        assert received == [event]

    def test_handler_does_not_receive_non_matching_source(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.SENSOR, event_type=EventType.CREATED)

        dispatcher.dispatch(_event(source=EventSource.WORKER))

        assert received == []

    def test_handler_does_not_receive_non_matching_event_type(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.SENSOR, event_type=EventType.CREATED)

        dispatcher.dispatch(_event(event_type=EventType.DELETED))

        assert received == []


class TestWildcardSubscriptions:
    def test_source_only_subscription_receives_any_event_type(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.SENSOR)

        dispatcher.dispatch(_event(event_type=EventType.CREATED))
        dispatcher.dispatch(_event(event_type=EventType.THRESHOLD_CROSSED))

        assert len(received) == 2

    def test_event_type_only_subscription_receives_any_source(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, event_type=EventType.CREATED)

        dispatcher.dispatch(_event(source=EventSource.SENSOR))
        dispatcher.dispatch(_event(source=EventSource.WORKER))

        assert len(received) == 2

    def test_catch_all_subscription_receives_every_event(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append)

        dispatcher.dispatch(_event(source=EventSource.SENSOR, event_type=EventType.CREATED))
        dispatcher.dispatch(_event(source=EventSource.PERMIT, event_type=EventType.DELETED))
        dispatcher.dispatch(_event(source=EventSource.COMPUTER_VISION, event_type=EventType.DETECTED))

        assert len(received) == 3

    def test_multiple_matching_subscriptions_all_receive_the_event(self) -> None:
        dispatcher = EventDispatcher()
        exact: list[Event] = []
        source_only: list[Event] = []
        catch_all: list[Event] = []
        dispatcher.subscribe(exact.append, source=EventSource.SENSOR, event_type=EventType.CREATED)
        dispatcher.subscribe(source_only.append, source=EventSource.SENSOR)
        dispatcher.subscribe(catch_all.append)

        dispatcher.dispatch(_event())

        assert len(exact) == 1
        assert len(source_only) == 1
        assert len(catch_all) == 1


class TestUnsubscribe:
    def test_unsubscribed_handler_stops_receiving_events(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.SENSOR, event_type=EventType.CREATED)
        dispatcher.unsubscribe(received.append, source=EventSource.SENSOR, event_type=EventType.CREATED)

        dispatcher.dispatch(_event())

        assert received == []

    def test_unsubscribe_of_unregistered_handler_is_a_no_op(self) -> None:
        dispatcher = EventDispatcher()

        def handler(event: Event) -> None:
            pass

        dispatcher.unsubscribe(handler)  # should not raise


class TestHandlerErrorIsolation:
    def test_failing_handler_does_not_prevent_other_handlers(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []

        def failing_handler(event: Event) -> None:
            raise RuntimeError("boom")

        dispatcher.subscribe(failing_handler, source=EventSource.SENSOR)
        dispatcher.subscribe(received.append, source=EventSource.SENSOR)

        dispatcher.dispatch(_event())

        assert len(received) == 1

    def test_custom_error_handler_is_invoked_with_event_handler_and_exception(self) -> None:
        errors: list[tuple[Event, object, Exception]] = []

        def on_error(event: Event, handler, exc: Exception) -> None:
            errors.append((event, handler, exc))

        dispatcher = EventDispatcher(on_handler_error=on_error)

        def failing_handler(event: Event) -> None:
            raise ValueError("bad")

        dispatcher.subscribe(failing_handler, source=EventSource.SENSOR)
        event = _event()
        dispatcher.dispatch(event)

        assert len(errors) == 1
        assert errors[0][0] is event
        assert isinstance(errors[0][2], ValueError)


class TestEventEnvelope:
    def test_as_dict_is_json_safe(self) -> None:
        event = _event(zone="Zone-A", payload={"value": 42.0}, correlation_id="corr-1")
        result = event.as_dict()

        assert result["source"] == "sensor"
        assert result["event_type"] == "created"
        assert result["zone"] == "Zone-A"
        assert result["payload"] == {"value": 42.0}
        assert result["correlation_id"] == "corr-1"
        assert isinstance(result["event_id"], str)
        assert isinstance(result["occurred_at"], str)

    def test_each_event_gets_a_unique_id(self) -> None:
        assert _event().event_id != _event().event_id
