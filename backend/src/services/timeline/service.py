"""Timeline service layer for SafeFusion AI.

Bridges the Unified Event Bus (``src.services.event_bus``) to persisted
storage: ``record(event)`` classifies an ``Event`` (severity, AI-decision
reference — see ``classification.py``) and persists it via an injected
repository port. Storage stays independent of the event bus and of any UI:
this module has no FastAPI dependency, and the repository port only needs
``create``/paginated-list/count methods, so a caller could swap in any
persistence backend without changing ``TimelineService`` or the routes
that use it.
"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID

from src.models.enums import SeverityLevel
from src.services.event_bus.schemas import Event
from src.services.timeline.classification import classify_severity, extract_ai_decision_reference
from src.services.timeline.schemas import TimelineRecord


class TimelineRepositoryPort(Protocol):
    """Repository contract required by ``TimelineService``."""

    def create(self, data: dict) -> object: ...

    def list_timeline(
        self,
        skip: int,
        limit: int,
        source: str | None,
        severity: SeverityLevel | None,
        zone: str | None,
        correlation_id: str | None,
        has_ai_decision: bool | None,
        occurred_after: datetime | None,
        occurred_before: datetime | None,
    ) -> list: ...

    def count_timeline(
        self,
        source: str | None,
        severity: SeverityLevel | None,
        zone: str | None,
        correlation_id: str | None,
        has_ai_decision: bool | None,
        occurred_after: datetime | None,
        occurred_before: datetime | None,
    ) -> int: ...

    def get_by_event_id(self, event_id: UUID) -> object | None: ...


def _to_record(row: object) -> TimelineRecord:
    """Adapt a persisted ``TimelineEvent`` ORM row into a ``TimelineRecord``."""
    return TimelineRecord(
        id=row.id,
        event_id=row.event_id,
        source=row.source,
        event_type=row.event_type,
        severity=row.severity,
        zone=row.zone,
        payload=row.payload,
        correlation_id=row.correlation_id,
        ai_decision_reference=row.ai_decision_reference,
        occurred_at=row.occurred_at,
        recorded_at=row.recorded_at,
    )


class TimelineService:
    """Persists platform events chronologically and serves them back, filtered."""

    def __init__(self, repository: TimelineRepositoryPort) -> None:
        self._repository = repository

    def record(self, event: Event) -> TimelineRecord:
        """Classify and persist one published ``Event``.

        Intended to be registered as a catch-all subscriber on an
        ``EventDispatcher`` (see
        ``src.services.timeline.subscriber.register_timeline_subscriber``)
        so every event published anywhere on the bus is recorded, but can
        also be called directly for a backfill/replay.
        """
        row = self._repository.create(
            {
                "event_id": event.event_id,
                "source": event.source.value,
                "event_type": event.event_type.value,
                "severity": classify_severity(event),
                "zone": event.zone,
                "payload": event.payload,
                "correlation_id": event.correlation_id,
                "ai_decision_reference": extract_ai_decision_reference(event),
                "occurred_at": event.occurred_at,
            }
        )
        return _to_record(row)

    def get_by_event_id(self, event_id: UUID) -> TimelineRecord | None:
        row = self._repository.get_by_event_id(event_id)
        return _to_record(row) if row is not None else None

    def list_timeline(
        self,
        skip: int = 0,
        limit: int = 100,
        source: str | None = None,
        severity: SeverityLevel | None = None,
        zone: str | None = None,
        correlation_id: str | None = None,
        has_ai_decision: bool | None = None,
        occurred_after: datetime | None = None,
        occurred_before: datetime | None = None,
    ) -> list[TimelineRecord]:
        """Return a filtered, paginated slice of the timeline, newest first."""
        rows = self._repository.list_timeline(
            skip=skip,
            limit=limit,
            source=source,
            severity=severity,
            zone=zone,
            correlation_id=correlation_id,
            has_ai_decision=has_ai_decision,
            occurred_after=occurred_after,
            occurred_before=occurred_before,
        )
        return [_to_record(row) for row in rows]

    def count_timeline(
        self,
        source: str | None = None,
        severity: SeverityLevel | None = None,
        zone: str | None = None,
        correlation_id: str | None = None,
        has_ai_decision: bool | None = None,
        occurred_after: datetime | None = None,
        occurred_before: datetime | None = None,
    ) -> int:
        """Return the total count of records matching the same filters as :meth:`list_timeline`."""
        return self._repository.count_timeline(
            source=source,
            severity=severity,
            zone=zone,
            correlation_id=correlation_id,
            has_ai_decision=has_ai_decision,
            occurred_after=occurred_after,
            occurred_before=occurred_before,
        )
