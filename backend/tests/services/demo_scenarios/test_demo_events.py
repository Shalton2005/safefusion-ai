"""Tests for publishing a DemoScenario's fixtures onto the event bus."""

from __future__ import annotations

from src.models.enums import (
    PermitStatus,
    PermitType,
    SensorStatus,
    SensorType,
    WorkerStatus,
)
from src.services.demo_scenarios.events import publish_scenario_events
from src.services.demo_scenarios.schemas import DemoPermit, DemoScenario, DemoSensorReading, DemoWorker
from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.schemas import Event, EventSource, EventType

_SCENARIO = DemoScenario(
    name="test_scenario",
    title="Test Scenario",
    narrative="A test scenario.",
    zone="Zone-Test",
    sensors=(
        DemoSensorReading("SEN-1", SensorType.GAS, 90.0, "ppm", SensorStatus.CRITICAL),
    ),
    workers=(
        DemoWorker(
            employee_id="EMP-1",
            worker_id="WRK-1",
            name="Test Worker",
            department="Operations",
            role="Operator",
            shift="Morning",
            status=WorkerStatus.EMERGENCY,
        ),
    ),
    permits=(
        DemoPermit(
            permit_id="PTW-1",
            permit_type=PermitType.HOT_WORK,
            issued_by="Safety Officer",
            assigned_team="Team A",
            status=PermitStatus.ACTIVE,
            start_offset_hours=-1.0,
            end_offset_hours=5.0,
        ),
    ),
)


class TestPublishScenarioEvents:
    def test_publishes_one_event_per_fixture(self) -> None:
        dispatcher = EventDispatcher()
        published = publish_scenario_events(_SCENARIO, dispatcher)
        assert len(published) == 3  # 1 sensor + 1 worker + 1 permit

    def test_events_carry_the_scenario_zone(self) -> None:
        dispatcher = EventDispatcher()
        published = publish_scenario_events(_SCENARIO, dispatcher)
        assert all(event.zone == "Zone-Test" for event in published)

    def test_events_carry_the_scenario_name_as_correlation_id(self) -> None:
        dispatcher = EventDispatcher()
        published = publish_scenario_events(_SCENARIO, dispatcher)
        assert all(event.correlation_id == "test_scenario" for event in published)

    def test_sensor_event_has_expected_source_type_and_payload(self) -> None:
        dispatcher = EventDispatcher()
        published = publish_scenario_events(_SCENARIO, dispatcher)
        sensor_events = [e for e in published if e.source == EventSource.SENSOR]
        assert len(sensor_events) == 1
        event = sensor_events[0]
        assert event.event_type == EventType.CREATED
        assert event.payload["sensor_type"] == "gas"
        assert event.payload["value"] == 90.0
        assert event.payload["status"] == "critical"

    def test_worker_event_has_expected_source_type_and_payload(self) -> None:
        dispatcher = EventDispatcher()
        published = publish_scenario_events(_SCENARIO, dispatcher)
        worker_events = [e for e in published if e.source == EventSource.WORKER]
        assert len(worker_events) == 1
        event = worker_events[0]
        assert event.event_type == EventType.UPDATED
        assert event.payload["employee_id"] == "EMP-1"
        assert event.payload["status"] == "emergency"
        assert event.payload["current_zone"] == "Zone-Test"

    def test_permit_event_has_expected_source_type_and_payload(self) -> None:
        dispatcher = EventDispatcher()
        published = publish_scenario_events(_SCENARIO, dispatcher)
        permit_events = [e for e in published if e.source == EventSource.PERMIT]
        assert len(permit_events) == 1
        event = permit_events[0]
        assert event.event_type == EventType.CREATED
        assert event.payload["permit_type"] == "hot_work"
        assert event.payload["status"] == "active"

    def test_events_actually_reach_a_subscriber(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append)

        publish_scenario_events(_SCENARIO, dispatcher)

        assert len(received) == 3

    def test_empty_scenario_publishes_nothing(self) -> None:
        empty_scenario = DemoScenario(
            name="empty", title="Empty", narrative="Nothing here.", zone="Zone-Empty"
        )
        dispatcher = EventDispatcher()
        published = publish_scenario_events(empty_scenario, dispatcher)
        assert published == []
