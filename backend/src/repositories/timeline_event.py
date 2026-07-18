"""
Timeline Event repository for SafeFusion AI.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.enums import SeverityLevel
from src.models.timeline_event import TimelineEvent
from src.repositories.base import BaseRepository


class TimelineEventRepository(BaseRepository[TimelineEvent]):
    """Data-access layer for the chronological TimelineEvent stream."""

    def __init__(self, db: Session) -> None:
        super().__init__(TimelineEvent, db)

    def get_by_event_id(self, event_id: UUID) -> TimelineEvent | None:
        """Return the timeline row for a given originating ``Event.event_id``, if recorded."""
        return self._db.execute(
            select(TimelineEvent).where(TimelineEvent.event_id == event_id)
        ).scalar_one_or_none()

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
    ) -> list[TimelineEvent]:
        """Return a filtered, paginated slice of the timeline, newest first.

        Every filter is optional and additive (AND-combined) — omitting a
        filter simply doesn't narrow the result on that dimension.

        Args:
            has_ai_decision: When ``True``, only rows with a non-null
                ``ai_decision_reference``; when ``False``, only rows
                without one; ``None`` applies no filter.
            occurred_after: Only rows with ``occurred_at`` strictly after
                this instant (exclusive).
            occurred_before: Only rows with ``occurred_at`` strictly
                before this instant (exclusive).
        """
        query = select(TimelineEvent)

        if source is not None:
            query = query.where(TimelineEvent.source == source)
        if severity is not None:
            query = query.where(TimelineEvent.severity == severity)
        if zone is not None:
            query = query.where(TimelineEvent.zone == zone)
        if correlation_id is not None:
            query = query.where(TimelineEvent.correlation_id == correlation_id)
        if has_ai_decision is True:
            query = query.where(TimelineEvent.ai_decision_reference.is_not(None))
        elif has_ai_decision is False:
            query = query.where(TimelineEvent.ai_decision_reference.is_(None))
        if occurred_after is not None:
            query = query.where(TimelineEvent.occurred_at > occurred_after)
        if occurred_before is not None:
            query = query.where(TimelineEvent.occurred_at < occurred_before)

        query = query.order_by(TimelineEvent.occurred_at.desc()).offset(skip).limit(limit)
        return list(self._db.execute(query).scalars().all())

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
        """Return the total count of rows matching the same filters as :meth:`list_timeline`."""
        query = select(func.count()).select_from(TimelineEvent)

        if source is not None:
            query = query.where(TimelineEvent.source == source)
        if severity is not None:
            query = query.where(TimelineEvent.severity == severity)
        if zone is not None:
            query = query.where(TimelineEvent.zone == zone)
        if correlation_id is not None:
            query = query.where(TimelineEvent.correlation_id == correlation_id)
        if has_ai_decision is True:
            query = query.where(TimelineEvent.ai_decision_reference.is_not(None))
        elif has_ai_decision is False:
            query = query.where(TimelineEvent.ai_decision_reference.is_(None))
        if occurred_after is not None:
            query = query.where(TimelineEvent.occurred_at > occurred_after)
        if occurred_before is not None:
            query = query.where(TimelineEvent.occurred_at < occurred_before)

        return self._db.execute(query).scalar_one()
