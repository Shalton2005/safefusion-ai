"""Unified Event Bus for SafeFusion AI.

One shared event schema (:class:`~src.services.event_bus.schemas.Event`)
that every backend module publishes through: Sensors, Workers, Permits,
Maintenance today, and a Computer Vision pipeline in the future (see
``EventSource.COMPUTER_VISION`` and ``ComputerVisionEventPayload`` — the
schema and dispatcher already support it; only a producer needs to be
built).

Three pieces, each independently usable and testable:
    - **Event model** (``schemas.py``, ``payloads.py``) — the envelope and
      per-domain payload shapes every publisher/subscriber agrees on.
    - **Publisher** (``publisher.py``) — what a producer calls to build
      and emit an ``Event``. Depends only on ``EventDispatcherPort``, a
      two-method protocol, never the concrete dispatcher.
    - **Dispatcher** (``dispatcher.py``) — routes a published ``Event`` to
      every handler subscribed to its source/event_type. In-process and
      synchronous, matching every existing cross-service call in this
      codebase (see the ``*AIPipelinePort`` hooks in
      ``src.services.sensor``/``worker``/``permit``/``maintenance``).

``integrations.py`` bridges each domain service's existing lifecycle hook
protocol to this bus without modifying the service itself; ``bus.py``
provides the process-wide default dispatcher used by route wiring.

Framework- and DB-independent by design, matching
``src.services.sensor_simulator`` and ``src.services.dataset_generation``:
nothing here imports FastAPI or SQLAlchemy except ``integrations.py``,
which only needs ORM types for its adapter method signatures.
"""

from src.services.event_bus.bus import get_default_dispatcher, reset_default_dispatcher
from src.services.event_bus.dispatcher import EventDispatcher, EventHandler
from src.services.event_bus.integrations import (
    MaintenanceEventPublisherAdapter,
    PermitEventPublisherAdapter,
    SensorEventPublisherAdapter,
    WorkerEventPublisherAdapter,
)
from src.services.event_bus.payloads import (
    ComputerVisionEventPayload,
    EventPayload,
    MaintenanceEventPayload,
    PermitEventPayload,
    SensorEventPayload,
    WorkerEventPayload,
)
from src.services.event_bus.publisher import EventDispatcherPort, EventPublisher
from src.services.event_bus.schemas import Event, EventSource, EventType

__all__ = [
    "Event",
    "EventSource",
    "EventType",
    "EventPayload",
    "SensorEventPayload",
    "WorkerEventPayload",
    "PermitEventPayload",
    "MaintenanceEventPayload",
    "ComputerVisionEventPayload",
    "EventPublisher",
    "EventDispatcherPort",
    "EventDispatcher",
    "EventHandler",
    "get_default_dispatcher",
    "reset_default_dispatcher",
    "SensorEventPublisherAdapter",
    "WorkerEventPublisherAdapter",
    "PermitEventPublisherAdapter",
    "MaintenanceEventPublisherAdapter",
]
