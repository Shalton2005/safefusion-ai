"""Add timeline_events table for the Event Timeline Service.

Revision ID: ea43d865b541
Revises: e2f9a1c7b8d4
Create Date: 2026-07-18 18:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "ea43d865b541"
down_revision: Union[str, None] = "e2f9a1c7b8d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create timeline_events."""
    op.create_table(
        "timeline_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "event_id",
            sa.Uuid(),
            nullable=False,
            comment="Originating src.services.event_bus.schemas.Event.event_id",
        ),
        sa.Column(
            "source",
            sa.String(length=30),
            nullable=False,
            comment="Publishing module, e.g. sensor/worker/permit/maintenance",
        ),
        sa.Column(
            "event_type",
            sa.String(length=30),
            nullable=False,
            comment="Occurrence category, e.g. created/updated/threshold_crossed",
        ),
        sa.Column(
            "severity",
            sa.String(length=20),
            nullable=False,
            server_default="low",
            comment="Severity classified at ingestion time from the event's source/type/payload",
        ),
        sa.Column("zone", sa.String(length=50), nullable=True),
        sa.Column(
            "payload",
            JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
            comment="Original event payload, preserved as-is",
        ),
        sa.Column(
            "correlation_id",
            sa.String(length=100),
            nullable=True,
            comment="Opaque id tying related events together",
        ),
        sa.Column(
            "ai_decision_reference",
            sa.String(length=200),
            nullable=True,
            comment="Free-form reference to the AI decision this event is linked to, if any",
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            comment="Original Event.occurred_at (when it happened)",
        ),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
            comment="When this row was persisted (may lag occurred_at slightly)",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", name="uq_timeline_events_event_id"),
    )
    op.create_index("ix_timeline_events_occurred_at", "timeline_events", ["occurred_at"], unique=False)
    op.create_index("ix_timeline_events_source", "timeline_events", ["source"], unique=False)
    op.create_index("ix_timeline_events_severity", "timeline_events", ["severity"], unique=False)
    op.create_index("ix_timeline_events_zone", "timeline_events", ["zone"], unique=False)
    op.create_index(
        "ix_timeline_events_ai_decision_reference",
        "timeline_events",
        ["ai_decision_reference"],
        unique=False,
    )


def downgrade() -> None:
    """Drop timeline_events."""
    op.drop_index("ix_timeline_events_ai_decision_reference", table_name="timeline_events")
    op.drop_index("ix_timeline_events_zone", table_name="timeline_events")
    op.drop_index("ix_timeline_events_severity", table_name="timeline_events")
    op.drop_index("ix_timeline_events_source", table_name="timeline_events")
    op.drop_index("ix_timeline_events_occurred_at", table_name="timeline_events")
    op.drop_table("timeline_events")
