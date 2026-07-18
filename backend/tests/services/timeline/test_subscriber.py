"""Tests for wiring TimelineService into the event bus dispatcher."""

from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import MagicMock, patch

from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.schemas import Event, EventSource, EventType
from src.services.timeline.subscriber import record_event_to_timeline, register_timeline_subscriber


def _fake_db_session_factory(fake_db):
    @contextmanager
    def _factory():
        yield fake_db

    return _factory


class TestRegisterTimelineSubscriber:
    def test_subscribes_record_event_to_timeline_as_catch_all(self) -> None:
        dispatcher = EventDispatcher()
        register_timeline_subscriber(dispatcher)

        # A catch-all subscription is keyed (None, None); reaching into
        # dispatcher internals here is acceptable for this one assertion
        # since EventDispatcher exposes no public "list subscriptions" API.
        from src.services.event_bus.dispatcher import _SubscriptionKey

        handlers = dispatcher._handlers[_SubscriptionKey(None, None)]
        assert record_event_to_timeline in handlers

    def test_registered_subscriber_is_invoked_on_any_published_event(self) -> None:
        dispatcher = EventDispatcher()
        calls = []
        dispatcher.subscribe(lambda event: calls.append(event))
        register_timeline_subscriber(dispatcher)

        with patch("src.services.timeline.subscriber.db_session", _fake_db_session_factory(MagicMock())):
            dispatcher.dispatch(Event(source=EventSource.SENSOR, event_type=EventType.CREATED))

        assert len(calls) == 1


class TestRecordEventToTimeline:
    def test_persists_event_via_timeline_service(self) -> None:
        fake_db = MagicMock()
        event = Event(source=EventSource.SENSOR, event_type=EventType.CREATED, payload={"status": "critical"})

        with patch("src.services.timeline.subscriber.db_session", _fake_db_session_factory(fake_db)):
            record_event_to_timeline(event)

        fake_db.add.assert_called_once()
        fake_db.commit.assert_called_once()

    def test_persistence_failure_is_swallowed_not_raised(self) -> None:
        broken_db = MagicMock()
        broken_db.add.side_effect = RuntimeError("db unavailable")
        event = Event(source=EventSource.SENSOR, event_type=EventType.CREATED)

        with patch("src.services.timeline.subscriber.db_session", _fake_db_session_factory(broken_db)):
            # Must not raise.
            record_event_to_timeline(event)

    def test_dispatch_does_not_propagate_a_broken_timeline_subscriber(self) -> None:
        """The publisher's dispatch() call must succeed even if the timeline
        subscriber's own persistence fails."""
        dispatcher = EventDispatcher()
        register_timeline_subscriber(dispatcher)

        broken_db = MagicMock()
        broken_db.add.side_effect = RuntimeError("db unavailable")

        with patch("src.services.timeline.subscriber.db_session", _fake_db_session_factory(broken_db)):
            # Should not raise despite the subscriber's DB failure.
            dispatcher.dispatch(Event(source=EventSource.WORKER, event_type=EventType.UPDATED))
