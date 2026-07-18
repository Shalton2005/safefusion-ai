"""Tests bridging each domain service's lifecycle hook to the event bus."""

from __future__ import annotations

import uuid

from src.models.enums import (
    MaintenanceStatus,
    MaintenanceType,
    PermitStatus,
    PermitType,
    SensorStatus,
    SensorType,
    WorkerStatus,
)
from src.models.maintenance import MaintenanceLog
from src.models.permit import Permit
from src.models.sensor import Sensor
from src.models.worker import Worker
from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.integrations import (
    MaintenanceEventPublisherAdapter,
    PermitEventPublisherAdapter,
    SensorEventPublisherAdapter,
    WorkerEventPublisherAdapter,
)
from src.services.event_bus.publisher import EventPublisher
from src.services.event_bus.schemas import Event, EventSource, EventType


class TestSensorEventPublisherAdapter:
    def test_on_sensor_created_publishes_created_event_with_zone_and_payload(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.SENSOR)
        adapter = SensorEventPublisherAdapter(EventPublisher(dispatcher, source=EventSource.SENSOR))

        sensor = Sensor(
            id=uuid.uuid4(),
            zone="Tank-Farm",
            sensor_type=SensorType.GAS,
            value=95.0,
            unit="ppm",
            status=SensorStatus.CRITICAL,
        )
        adapter.on_sensor_created(sensor)

        assert len(received) == 1
        event = received[0]
        assert event.event_type is EventType.CREATED
        assert event.zone == "Tank-Farm"
        assert event.payload["sensor_id"] == str(sensor.id)
        assert event.payload["value"] == 95.0
        assert event.payload["status"] == "critical"

    def test_on_sensor_deleted_publishes_deleted_event_with_id_only(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.SENSOR, event_type=EventType.DELETED)
        adapter = SensorEventPublisherAdapter(EventPublisher(dispatcher, source=EventSource.SENSOR))

        sensor_id = uuid.uuid4()
        adapter.on_sensor_deleted(sensor_id)

        assert received[0].payload == {"sensor_id": str(sensor_id)}


class TestWorkerEventPublisherAdapter:
    def test_on_worker_updated_publishes_updated_event(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.WORKER, event_type=EventType.UPDATED)
        adapter = WorkerEventPublisherAdapter(EventPublisher(dispatcher, source=EventSource.WORKER))

        worker = Worker(
            id=uuid.uuid4(),
            name="Vikram Singh",
            employee_id="EMP-0002",
            department="Operations",
            role="Field Operator",
            current_zone="Tank-Farm",
            shift="Morning",
            status=WorkerStatus.EMERGENCY,
        )
        adapter.on_worker_updated(worker)

        event = received[0]
        assert event.zone == "Tank-Farm"
        assert event.payload["employee_id"] == "EMP-0002"
        assert event.payload["status"] == "emergency"


class TestPermitEventPublisherAdapter:
    def test_on_permit_created_publishes_created_event(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.PERMIT)
        adapter = PermitEventPublisherAdapter(EventPublisher(dispatcher, source=EventSource.PERMIT))

        permit = Permit(
            id=uuid.uuid4(),
            permit_type=PermitType.HOT_WORK,
            zone="Boiler-Area",
            issued_by="Safety Officer Patel",
            assigned_team="Mechanical Team Bravo",
            start_time=None,
            end_time=None,
            status=PermitStatus.ACTIVE,
        )
        adapter.on_permit_created(permit)

        event = received[0]
        assert event.zone == "Boiler-Area"
        assert event.payload["permit_type"] == "hot_work"
        assert event.payload["status"] == "active"


class TestMaintenanceEventPublisherAdapter:
    def test_on_maintenance_log_created_publishes_created_event(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, source=EventSource.MAINTENANCE)
        adapter = MaintenanceEventPublisherAdapter(
            EventPublisher(dispatcher, source=EventSource.MAINTENANCE)
        )

        log = MaintenanceLog(
            id=uuid.uuid4(),
            equipment_id="EQ-TF-001",
            equipment_name="Tank Farm Vapor Recovery Unit",
            maintenance_type=MaintenanceType.PREVENTIVE,
            assigned_team="Mechanical Team Bravo",
            status=MaintenanceStatus.PLANNED,
        )
        adapter.on_maintenance_log_created(log)

        event = received[0]
        assert event.zone is None
        assert event.payload["equipment_id"] == "EQ-TF-001"
        assert event.payload["maintenance_type"] == "preventive"

    def test_on_maintenance_log_deleted_publishes_deleted_event_with_id_only(self) -> None:
        dispatcher = EventDispatcher()
        received: list[Event] = []
        dispatcher.subscribe(received.append, event_type=EventType.DELETED)
        adapter = MaintenanceEventPublisherAdapter(
            EventPublisher(dispatcher, source=EventSource.MAINTENANCE)
        )

        log_id = uuid.uuid4()
        adapter.on_maintenance_log_deleted(log_id)

        assert received[0].payload == {"log_id": str(log_id)}
