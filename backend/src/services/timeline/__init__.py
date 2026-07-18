"""Event Timeline Service for SafeFusion AI.

Stores every platform event — published by any producer on the Unified
Event Bus (``src.services.event_bus``) — chronologically, independent of
any UI. Each persisted record carries the event's source, a classified
severity, its timestamp, and (when the publisher supplied one) a
free-form reference linking it to the AI decision that produced or
responded to it.

Pieces:
    - ``classification.py`` — pure functions deriving severity and an
      AI-decision reference from an ``Event`` (no persistence, no DB).
    - ``service.py`` — ``TimelineService``: classifies and persists events,
      and serves them back filtered/paginated. Depends only on a minimal
      ``TimelineRepositoryPort``, matching every other service in this
      codebase — storage is a swappable implementation detail.
    - ``subscriber.py`` — registers ``TimelineService`` as a catch-all
      ``EventDispatcher`` subscriber so every bus event is recorded
      automatically, with its own DB session per event.

See ``src.routes.timeline`` for the REST API (``GET /timeline`` etc.).
"""

from src.services.timeline.classification import classify_severity, extract_ai_decision_reference
from src.services.timeline.schemas import TimelineRecord
from src.services.timeline.service import TimelineRepositoryPort, TimelineService
from src.services.timeline.subscriber import record_event_to_timeline, register_timeline_subscriber

__all__ = [
    "TimelineRecord",
    "TimelineService",
    "TimelineRepositoryPort",
    "classify_severity",
    "extract_ai_decision_reference",
    "record_event_to_timeline",
    "register_timeline_subscriber",
]
