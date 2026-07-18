"""Process-wide default dispatcher access.

A single ``EventDispatcher`` instance is what lets a subscriber registered
by one module (e.g. an alerting pipeline) receive events published by
another (e.g. the sensor service) without the two being wired together
directly. Nothing requires using this shared instance — tests and any
caller that wants isolation should construct their own
``EventDispatcher()`` instead (every constructor in this package takes the
dispatcher/publisher as an explicit argument, never reaches for this
global itself) — but route wiring and application startup need one
common place to get the default, hence this module.
"""

from __future__ import annotations

from src.services.event_bus.dispatcher import EventDispatcher

_default_dispatcher: EventDispatcher | None = None


def get_default_dispatcher() -> EventDispatcher:
    """Return the process-wide default ``EventDispatcher``, creating it on first use."""
    global _default_dispatcher
    if _default_dispatcher is None:
        _default_dispatcher = EventDispatcher()
    return _default_dispatcher


def reset_default_dispatcher() -> None:
    """Discard the process-wide default dispatcher and all its subscriptions.

    Intended for test teardown so subscriptions registered by one test
    don't leak into the next; application code should not need this.
    """
    global _default_dispatcher
    _default_dispatcher = None
