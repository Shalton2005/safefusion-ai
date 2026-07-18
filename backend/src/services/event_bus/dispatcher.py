"""Event dispatcher: routes published events to subscribed handlers.

In-process and synchronous by design — every existing cross-service call
in this codebase (the ``*AIPipelinePort`` hooks in
``src.services.sensor``/``worker``/``permit``, the compound risk / emergency
response engines) is a direct, in-process call with no queue or broker in
between (see module survey: no Celery/arq/broker settings exist in
``src.config.settings``). The dispatcher follows that same convention
rather than introducing new infrastructure. A future out-of-process
transport (e.g. Redis Streams, Kafka) can be added as an alternative
``EventDispatcherPort`` implementation without touching any publisher —
see the ``EventDispatcherPort`` protocol in ``publisher.py``.

Handlers are plain callables ``(Event) -> None``. Subscriptions can target:
    - one exact ``(source, event_type)`` pair,
    - every event from a given ``source`` (event_type=None),
    - every event of a given ``event_type`` regardless of source (source=None),
    - every event (both None) — a catch-all, e.g. for audit logging.

A handler that raises is caught and reported via ``on_handler_error``
rather than propagating: one failing subscriber (e.g. a flaky AI pipeline
hook) must not stop other subscribers from receiving the same event, nor
abort the publisher's calling code.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable

from src.services.event_bus.schemas import Event, EventSource, EventType

EventHandler = Callable[[Event], None]

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class _SubscriptionKey:
    source: EventSource | None
    event_type: EventType | None


class EventDispatcher:
    """Registers handlers and routes published events to every matching one."""

    def __init__(self, on_handler_error: Callable[[Event, EventHandler, Exception], None] | None = None) -> None:
        self._handlers: dict[_SubscriptionKey, list[EventHandler]] = defaultdict(list)
        self._on_handler_error = on_handler_error or self._default_error_handler

    def subscribe(
        self,
        handler: EventHandler,
        source: EventSource | None = None,
        event_type: EventType | None = None,
    ) -> None:
        """Register ``handler`` for events matching ``source``/``event_type``.

        Args:
            handler: Called with each matching ``Event``.
            source: Restrict to events from this module, or ``None`` for any.
            event_type: Restrict to this event type, or ``None`` for any.
        """
        self._handlers[_SubscriptionKey(source, event_type)].append(handler)

    def unsubscribe(
        self,
        handler: EventHandler,
        source: EventSource | None = None,
        event_type: EventType | None = None,
    ) -> None:
        """Remove a previously registered handler for the given key, if present."""
        key = _SubscriptionKey(source, event_type)
        if handler in self._handlers[key]:
            self._handlers[key].remove(handler)

    def dispatch(self, event: Event) -> None:
        """Deliver ``event`` to every handler subscribed to a matching key.

        Matching keys, in the order handlers are invoked: exact
        ``(source, event_type)``, source-only, event_type-only, then the
        catch-all ``(None, None)``. A handler that raises is reported via
        ``on_handler_error`` and does not prevent remaining handlers (for
        this key or any other matching key) from running.
        """
        keys = (
            _SubscriptionKey(event.source, event.event_type),
            _SubscriptionKey(event.source, None),
            _SubscriptionKey(None, event.event_type),
            _SubscriptionKey(None, None),
        )
        for key in keys:
            for handler in list(self._handlers.get(key, ())):
                try:
                    handler(event)
                except Exception as exc:  # noqa: BLE001 - isolate one bad subscriber from the rest
                    self._on_handler_error(event, handler, exc)

    @staticmethod
    def _default_error_handler(event: Event, handler: EventHandler, exc: Exception) -> None:
        logger.exception(
            "Event handler %r failed for event %s (%s/%s)",
            getattr(handler, "__name__", handler),
            event.event_id,
            event.source.value,
            event.event_type.value,
        )
