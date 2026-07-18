"""Wires the Timeline Service into the Unified Event Bus as a catch-all subscriber.

The dispatcher (``src.services.event_bus.dispatcher.EventDispatcher``) is
in-process and synchronous with no notion of an HTTP request or session
scope — a subscriber handler is just a plain callable. Persisting from
inside that callback therefore needs to open and close its own database
session per event rather than relying on a request-scoped one (there
isn't one), which is exactly what
``src.database.session.db_session()`` provides.

A subscriber registered here never lets a persistence failure propagate
back through the dispatcher: ``EventDispatcher.dispatch()`` already
isolates one failing handler from the rest (see
``EventDispatcher._default_error_handler``), but a broken timeline
recorder must especially never block the publisher whose event triggered
it — publishing a sensor reading must succeed regardless of whether the
timeline's database is reachable.
"""

from __future__ import annotations

import logging

from src.database.session import db_session
from src.repositories.timeline_event import TimelineEventRepository
from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.schemas import Event
from src.services.timeline.service import TimelineService

logger = logging.getLogger(__name__)


def record_event_to_timeline(event: Event) -> None:
    """Persist one published ``Event`` to the timeline, opening its own DB session.

    Swallows any exception after logging it — see module docstring for why
    a timeline persistence failure must never propagate back through the
    dispatcher to the original publisher.
    """
    try:
        with db_session() as db:
            TimelineService(TimelineEventRepository(db)).record(event)
    except Exception:  # noqa: BLE001 - isolate timeline persistence from the publisher
        logger.exception(
            "Failed to record event %s (%s/%s) to the timeline",
            event.event_id,
            event.source.value,
            event.event_type.value,
        )


def register_timeline_subscriber(dispatcher: EventDispatcher) -> None:
    """Subscribe :func:`record_event_to_timeline` to every event on ``dispatcher``.

    Call once at application startup (see ``server.py``'s lifespan) against
    the process-wide default dispatcher
    (``src.services.event_bus.bus.get_default_dispatcher()``) so every
    event published anywhere — sensors, workers, permits, maintenance, and
    any future producer — is recorded without each producer needing to
    know the timeline exists.
    """
    dispatcher.subscribe(record_event_to_timeline)
