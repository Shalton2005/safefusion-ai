"""Tests for TimelineService using a fake in-memory repository."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from src.models.enums import SeverityLevel
from src.services.event_bus.schemas import Event, EventSource, EventType
from src.services.timeline.service import TimelineService


@dataclass
class _FakeRow:
    id: uuid.UUID
    event_id: uuid.UUID
    source: str
    event_type: str
    severity: SeverityLevel
    zone: str | None
    payload: dict
    correlation_id: str | None
    ai_decision_reference: str | None
    occurred_at: datetime
    recorded_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class _FakeTimelineRepository:
    """In-memory stand-in for TimelineEventRepository, conforming to TimelineRepositoryPort."""

    def __init__(self) -> None:
        self.rows: list[_FakeRow] = []

    def create(self, data: dict) -> _FakeRow:
        row = _FakeRow(id=uuid.uuid4(), **data)
        self.rows.append(row)
        return row

    def get_by_event_id(self, event_id):
        return next((r for r in self.rows if r.event_id == event_id), None)

    def list_timeline(
        self, skip, limit, source, severity, zone, correlation_id, has_ai_decision, occurred_after, occurred_before
    ):
        results = self.rows
        if source is not None:
            results = [r for r in results if r.source == source]
        if severity is not None:
            results = [r for r in results if r.severity == severity]
        if zone is not None:
            results = [r for r in results if r.zone == zone]
        if correlation_id is not None:
            results = [r for r in results if r.correlation_id == correlation_id]
        if has_ai_decision is True:
            results = [r for r in results if r.ai_decision_reference is not None]
        elif has_ai_decision is False:
            results = [r for r in results if r.ai_decision_reference is None]
        results = sorted(results, key=lambda r: r.occurred_at, reverse=True)
        return results[skip : skip + limit]

    def count_timeline(
        self, source, severity, zone, correlation_id, has_ai_decision, occurred_after, occurred_before
    ):
        return len(
            self.list_timeline(0, len(self.rows) or 1, source, severity, zone, correlation_id, has_ai_decision, occurred_after, occurred_before)
        )


def _event(**overrides) -> Event:
    defaults = dict(source=EventSource.SENSOR, event_type=EventType.CREATED, payload={"status": "critical"}, zone="Zone-A")
    defaults.update(overrides)
    return Event(**defaults)


class TestRecord:
    def test_record_persists_and_returns_a_timeline_record(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)

        record = service.record(_event())

        assert len(repo.rows) == 1
        assert record.source == "sensor"
        assert record.event_type == "created"
        assert record.zone == "Zone-A"

    def test_record_classifies_severity_from_payload(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)

        record = service.record(_event(payload={"status": "critical"}))

        assert record.severity == SeverityLevel.CRITICAL

    def test_record_preserves_event_id_and_correlation_id(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)
        event = _event(correlation_id="corr-1")

        record = service.record(event)

        assert record.event_id == event.event_id
        assert record.correlation_id == "corr-1"

    def test_record_extracts_ai_decision_reference(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)

        record = service.record(_event(payload={"ai_decision_reference": "rec-1"}))

        assert record.ai_decision_reference == "rec-1"

    def test_record_without_ai_decision_reference_is_none(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)

        record = service.record(_event(payload={"status": "normal"}))

        assert record.ai_decision_reference is None


class TestGetByEventId:
    def test_returns_matching_record(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)
        event = _event()
        service.record(event)

        found = service.get_by_event_id(event.event_id)

        assert found is not None
        assert found.event_id == event.event_id

    def test_returns_none_when_not_found(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)

        assert service.get_by_event_id(uuid.uuid4()) is None


class TestListAndCountTimeline:
    def test_filters_by_source(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)
        service.record(_event(source=EventSource.SENSOR))
        service.record(_event(source=EventSource.WORKER, payload={"status": "working"}))

        results = service.list_timeline(source="sensor")

        assert len(results) == 1
        assert results[0].source == "sensor"

    def test_filters_by_severity(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)
        service.record(_event(payload={"status": "critical"}))
        service.record(_event(payload={"status": "normal"}))

        results = service.list_timeline(severity=SeverityLevel.CRITICAL)

        assert len(results) == 1
        assert results[0].severity == SeverityLevel.CRITICAL

    def test_filters_by_zone(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)
        service.record(_event(zone="Zone-A"))
        service.record(_event(zone="Zone-B"))

        results = service.list_timeline(zone="Zone-B")

        assert len(results) == 1
        assert results[0].zone == "Zone-B"

    def test_filters_by_has_ai_decision_true(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)
        service.record(_event(payload={"status": "critical", "ai_decision_reference": "rec-1"}))
        service.record(_event(payload={"status": "normal"}))

        results = service.list_timeline(has_ai_decision=True)

        assert len(results) == 1
        assert results[0].ai_decision_reference == "rec-1"

    def test_count_matches_list_length_for_same_filters(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)
        for _ in range(3):
            service.record(_event())

        assert service.count_timeline() == 3
        assert len(service.list_timeline(limit=100)) == 3

    def test_no_records_returns_empty_list_and_zero_count(self) -> None:
        repo = _FakeTimelineRepository()
        service = TimelineService(repository=repo)

        assert service.list_timeline() == []
        assert service.count_timeline() == 0
