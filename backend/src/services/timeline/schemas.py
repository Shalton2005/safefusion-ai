"""Dataclasses for the Event Timeline Service.

``TimelineRecord`` is the in-memory shape a ``TimelineEventRepository`` row
maps to/from — this module has no SQLAlchemy dependency itself, matching
the framework-agnostic split used by ``src.services.compound_risk`` and
``src.services.sensor_simulator``: the ORM lives in ``src.models``, this
module describes the domain shape.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from src.models.enums import SeverityLevel


@dataclass(frozen=True)
class TimelineRecord:
    """One persisted, chronologically-ordered platform event.

    Attributes:
        id: Primary key of the persisted row.
        event_id: The originating ``Event.event_id`` this record projects.
        source: Publishing module (mirrors ``EventSource.value``, stored
            as a plain string so this model has no event-bus dependency).
        event_type: Occurrence category (mirrors ``EventType.value``).
        severity: Severity classified at ingestion time — see
            ``src.services.timeline.classification``.
        zone: Plant zone the event concerns, if any.
        payload: The original event's payload, preserved as-is.
        correlation_id: Opaque id tying related events together.
        ai_decision_reference: Free-form reference to the AI decision this
            event is linked to, if any (see
            ``src.services.timeline.classification.extract_ai_decision_reference``).
        occurred_at: When the underlying event happened.
        recorded_at: When this record was persisted.
    """

    id: uuid.UUID
    event_id: uuid.UUID
    source: str
    event_type: str
    severity: SeverityLevel
    occurred_at: datetime
    recorded_at: datetime
    zone: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    correlation_id: str | None = None
    ai_decision_reference: str | None = None
