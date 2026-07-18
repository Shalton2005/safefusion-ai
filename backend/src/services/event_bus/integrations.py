"""Adapters wiring each domain service's lifecycle hook to the event bus.

``SensorService``, ``WorkerService``, and ``PermitService`` already accept
an optional ``*AIPipelinePort`` (``on_<domain>_created/updated/deleted``)
in their constructor — see ``src.services.sensor``, ``src.services.worker``,
``src.services.permit``. Each adapter below *implements* that existing
protocol by publishing an ``Event`` instead of doing nothing, so wiring a
domain service into the event bus is a one-line constructor change at the
call site (see each route module's ``get_<domain>_service`` factory) and
never requires modifying the service itself.

``MaintenanceLogService`` had no such hook at all — it is extended here
with the same ``MaintenanceLogAIPipelinePort`` shape as its siblings so
Maintenance can publish through the same mechanism as the other three
required domains, keeping the four "Support" entities in the ticket
symmetric.
"""

from __future__ import annotations

import uuid

from src.models.maintenance import MaintenanceLog
from src.models.permit import Permit
from src.models.sensor import Sensor
from src.models.worker import Worker
from src.services.event_bus.payloads import (
    MaintenanceEventPayload,
    PermitEventPayload,
    SensorEventPayload,
    WorkerEventPayload,
)
from src.services.event_bus.publisher import EventPublisher
from src.services.event_bus.schemas import EventType


class SensorEventPublisherAdapter:
    """Implements ``SensorAIPipelinePort`` by publishing to the event bus."""

    def __init__(self, publisher: EventPublisher) -> None:
        self._publisher = publisher

    def on_sensor_created(self, sensor: Sensor) -> None:
        self._publish(sensor, EventType.CREATED)

    def on_sensor_updated(self, sensor: Sensor) -> None:
        self._publish(sensor, EventType.UPDATED)

    def on_sensor_deleted(self, sensor_id: uuid.UUID) -> None:
        self._publisher.publish(
            EventType.DELETED,
            payload={"sensor_id": str(sensor_id)},
        )

    def _publish(self, sensor: Sensor, event_type: EventType) -> None:
        payload = SensorEventPayload(
            sensor_id=sensor.id,
            sensor_type=sensor.sensor_type.value,
            value=sensor.value,
            unit=sensor.unit,
            status=sensor.status.value,
        )
        self._publisher.publish(event_type, payload=payload.as_dict(), zone=sensor.zone)


class WorkerEventPublisherAdapter:
    """Implements ``WorkerAIPipelinePort`` by publishing to the event bus."""

    def __init__(self, publisher: EventPublisher) -> None:
        self._publisher = publisher

    def on_worker_created(self, worker: Worker) -> None:
        self._publish(worker, EventType.CREATED)

    def on_worker_updated(self, worker: Worker) -> None:
        self._publish(worker, EventType.UPDATED)

    def on_worker_deleted(self, worker_id: uuid.UUID) -> None:
        self._publisher.publish(
            EventType.DELETED,
            payload={"worker_id": str(worker_id)},
        )

    def _publish(self, worker: Worker, event_type: EventType) -> None:
        payload = WorkerEventPayload(
            worker_id=worker.id,
            employee_id=worker.employee_id,
            status=worker.status.value,
            current_zone=worker.current_zone,
        )
        self._publisher.publish(event_type, payload=payload.as_dict(), zone=worker.current_zone)


class PermitEventPublisherAdapter:
    """Implements ``PermitAIPipelinePort`` by publishing to the event bus."""

    def __init__(self, publisher: EventPublisher) -> None:
        self._publisher = publisher

    def on_permit_created(self, permit: Permit) -> None:
        self._publish(permit, EventType.CREATED)

    def on_permit_updated(self, permit: Permit) -> None:
        self._publish(permit, EventType.UPDATED)

    def on_permit_deleted(self, permit_id: uuid.UUID) -> None:
        self._publisher.publish(
            EventType.DELETED,
            payload={"permit_id": str(permit_id)},
        )

    def _publish(self, permit: Permit, event_type: EventType) -> None:
        payload = PermitEventPayload(
            permit_id=permit.id,
            permit_type=permit.permit_type.value,
            status=permit.status.value,
        )
        self._publisher.publish(event_type, payload=payload.as_dict(), zone=permit.zone)


class MaintenanceEventPublisherAdapter:
    """Implements ``MaintenanceLogAIPipelinePort`` by publishing to the event bus."""

    def __init__(self, publisher: EventPublisher) -> None:
        self._publisher = publisher

    def on_maintenance_log_created(self, log: MaintenanceLog) -> None:
        self._publish(log, EventType.CREATED)

    def on_maintenance_log_updated(self, log: MaintenanceLog) -> None:
        self._publish(log, EventType.UPDATED)

    def on_maintenance_log_deleted(self, log_id: uuid.UUID) -> None:
        self._publisher.publish(
            EventType.DELETED,
            payload={"log_id": str(log_id)},
        )

    def _publish(self, log: MaintenanceLog, event_type: EventType) -> None:
        payload = MaintenanceEventPayload(
            log_id=log.id,
            equipment_id=log.equipment_id,
            maintenance_type=log.maintenance_type.value,
            status=log.status.value,
        )
        self._publisher.publish(event_type, payload=payload.as_dict())
