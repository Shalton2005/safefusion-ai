"""Tests for the TimelineEvent model shape and TimelineEventRepository query construction.

No live PostgreSQL instance is available in this test environment (see
``tests/repositories/test_document_embedding.py`` for the same
constraint), so these tests verify the ORM model's column/table shape via
DDL compilation, and that the repository's methods exist with the
expected signature — full query execution is covered indirectly through
``tests/services/timeline/test_service.py``'s fake-repository tests.
"""

from __future__ import annotations

from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from src.models.timeline_event import TimelineEvent
from src.repositories.timeline_event import TimelineEventRepository


class TestTimelineEventModel:
    def test_table_name(self) -> None:
        assert TimelineEvent.__tablename__ == "timeline_events"

    def test_ddl_declares_required_columns(self) -> None:
        ddl = str(CreateTable(TimelineEvent.__table__).compile(dialect=postgresql.dialect()))
        for column in (
            "event_id",
            "source",
            "event_type",
            "severity",
            "zone",
            "payload",
            "correlation_id",
            "ai_decision_reference",
            "occurred_at",
            "recorded_at",
        ):
            assert column in ddl

    def test_ddl_declares_jsonb_payload_column(self) -> None:
        ddl = str(CreateTable(TimelineEvent.__table__).compile(dialect=postgresql.dialect()))
        assert "JSONB" in ddl

    def test_event_id_and_source_and_occurred_at_are_not_nullable(self) -> None:
        assert TimelineEvent.__table__.c.event_id.nullable is False
        assert TimelineEvent.__table__.c.source.nullable is False
        assert TimelineEvent.__table__.c.occurred_at.nullable is False

    def test_zone_and_ai_decision_reference_are_nullable(self) -> None:
        assert TimelineEvent.__table__.c.zone.nullable is True
        assert TimelineEvent.__table__.c.ai_decision_reference.nullable is True
        assert TimelineEvent.__table__.c.correlation_id.nullable is True

    def test_event_id_is_unique(self) -> None:
        assert TimelineEvent.__table__.c.event_id.unique is True

    def test_expected_indexes_exist(self) -> None:
        index_names = {index.name for index in TimelineEvent.__table__.indexes}
        assert index_names == {
            "ix_timeline_events_occurred_at",
            "ix_timeline_events_source",
            "ix_timeline_events_severity",
            "ix_timeline_events_zone",
            "ix_timeline_events_ai_decision_reference",
        }


class TestTimelineEventRepository:
    def test_extends_base_repository_with_expected_methods(self) -> None:
        assert hasattr(TimelineEventRepository, "list_timeline")
        assert hasattr(TimelineEventRepository, "count_timeline")
        assert hasattr(TimelineEventRepository, "get_by_event_id")
        # Inherited from BaseRepository
        assert hasattr(TimelineEventRepository, "create")
        assert hasattr(TimelineEventRepository, "get_all")
        assert hasattr(TimelineEventRepository, "get_by_id")
