"""Event publisher: the one entry point every backend module publishes through.

``EventPublisher`` depends only on ``EventDispatcherPort`` — a two-method
protocol, not the concrete ``EventDispatcher`` — so a producer (a service's
AI pipeline adapter, a route, a script) never imports the dispatcher
directly. This mirrors every other port pattern in ``src.services``
(``SensorRepositoryPort``, ``AlertGenerationPort``, etc.): depend on the
narrowest contract, not the implementation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from src.services.event_bus.schemas import Event, EventSource, EventType


class EventDispatcherPort(Protocol):
    """Contract an ``EventPublisher`` needs from a dispatcher.

    Satisfied by ``EventDispatcher`` today; satisfied equally by a future
    out-of-process transport (e.g. one that serializes ``Event.as_dict()``
    onto a queue) without any change to ``EventPublisher`` or its callers.
    """

    def dispatch(self, event: Event) -> None: ...


class EventPublisher:
    """Builds and dispatches ``Event`` envelopes for one fixed ``EventSource``.

    Each backend module (sensors, workers, permits, maintenance, a future
    computer-vision pipeline) constructs its own ``EventPublisher`` bound
    to its own ``EventSource`` — see
    ``src.services.event_bus.integrations`` for the adapters that wire
    each domain service's existing lifecycle hooks to one of these.
    """

    def __init__(self, dispatcher: EventDispatcherPort, source: EventSource) -> None:
        self._dispatcher = dispatcher
        self._source = source

    @property
    def source(self) -> EventSource:
        return self._source

    def publish(
        self,
        event_type: EventType,
        payload: dict | None = None,
        zone: str | None = None,
        correlation_id: str | None = None,
        occurred_at: datetime | None = None,
    ) -> Event:
        """Build an ``Event`` for this publisher's source and dispatch it.

        Args:
            occurred_at: When the underlying event happened. Defaults to
                ``Event``'s own default (wall-clock now) when omitted.
                Callers that need reproducible timestamps — e.g.
                ``src.services.demo_scenarios``, which publishes events
                against a fixed anchor time rather than real time — must
                pass this explicitly, since omitting it always produces a
                fresh ``datetime.now()`` on every call.

        Returns the constructed ``Event`` so callers can log its
        ``event_id`` or chain a ``correlation_id`` onto a subsequent
        publish, without needing to reconstruct the envelope themselves.
        """
        kwargs = {}
        if occurred_at is not None:
            kwargs["occurred_at"] = occurred_at
        event = Event(
            source=self._source,
            event_type=event_type,
            payload=payload or {},
            zone=zone,
            correlation_id=correlation_id,
            **kwargs,
        )
        self._dispatcher.dispatch(event)
        return event
