"""
Timeline Event ORM model for SafeFusion AI.

Maps to the ``timeline_events`` table: an append-only, chronologically
ordered record of every platform event, independent of any single UI or
producing module. A row here is a persisted, queryable projection of one
``src.services.event_bus.schemas.Event`` (see
``src.services.timeline.service.TimelineService``) — this model
deliberately does not import the event bus package, since storage must
stay independent of how events are produced or consumed.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base
from src.models.enums import SeverityLevel, enum_column


class TimelineEvent(Base):
    """SQLAlchemy ORM model for one chronologically-ordered platform event."""

    __tablename__ = "timeline_events"

    __table_args__ = (
        Index("ix_timeline_events_occurred_at", "occurred_at"),
        Index("ix_timeline_events_source", "source"),
        Index("ix_timeline_events_severity", "severity"),
        Index("ix_timeline_events_zone", "zone"),
        Index("ix_timeline_events_ai_decision_reference", "ai_decision_reference"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
        unique=True,
        comment="Originating src.services.event_bus.schemas.Event.event_id",
    )
    source: Mapped[str] = mapped_column(
        String(30), nullable=False, comment="Publishing module, e.g. sensor/worker/permit/maintenance"
    )
    event_type: Mapped[str] = mapped_column(
        String(30), nullable=False, comment="Occurrence category, e.g. created/updated/threshold_crossed"
    )
    severity: Mapped[SeverityLevel] = mapped_column(
        enum_column(SeverityLevel, length=20),
        nullable=False,
        default=SeverityLevel.LOW,
        comment="Severity classified at ingestion time from the event's source/type/payload",
    )
    zone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payload: Mapped[dict] = mapped_column(
        JSONB(), nullable=False, server_default="{}", comment="Original event payload, preserved as-is"
    )
    correlation_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Opaque id tying related events together"
    )
    ai_decision_reference: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        comment=(
            "Free-form reference to the AI decision this event is linked to "
            "(e.g. a recommendation's source+zone+reason, or an "
            "explainability summary id). No decisions table exists yet — "
            "this column stores whatever identifier the publisher supplies."
        ),
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="Original Event.occurred_at (when it happened)"
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="When this row was persisted (may lag occurred_at slightly)",
    )
