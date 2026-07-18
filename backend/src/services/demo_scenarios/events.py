"""Publishes a ``DemoScenario``'s fixed fixtures onto the Unified Event Bus.

Every event uses ``scenario.name`` as its ``correlation_id`` (see
``src.services.event_bus.schemas.Event.correlation_id``), so a live demo's
audience — or a subscriber wired up for the demo — can filter the bus down
to exactly the events one scenario produced, even if other activity is
happening on the same dispatcher at the same time.

Publishing order mirrors a plausible real-world sequence for a live
narrative: sensors report first (the earliest signal), then worker
presence, then permit state, then maintenance history — the same order
``src.services.demo_scenarios.summaries`` builds monitoring summaries in.
"""

from __future__ import annotations

from src.services.demo_scenarios.schemas import DEMO_ANCHOR_TIME, DemoScenario
from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.payloads import (
    MaintenanceEventPayload,
    PermitEventPayload,
    SensorEventPayload,
    WorkerEventPayload,
)
from src.services.event_bus.publisher import EventPublisher
from src.services.event_bus.schemas import Event, EventSource, EventType


def publish_scenario_events(scenario: DemoScenario, dispatcher: EventDispatcher) -> list[Event]:
    """Publish every fixture in ``scenario`` to ``dispatcher`` and return the published events.

    Args:
        scenario: The fixed scenario whose sensors/workers/permits/
            maintenance logs become events.
        dispatcher: Target dispatcher — pass
            ``src.services.event_bus.bus.get_default_dispatcher()`` to
            reach the process-wide bus any other module has subscribed
            to, or a fresh ``EventDispatcher()`` for an isolated run
            (e.g. in a test).

    Returns:
        Every ``Event`` published, in publish order — useful for a live
        demo's console/UI output showing exactly what crossed the bus.
    """
    published: list[Event] = []

    sensor_publisher = EventPublisher(dispatcher, source=EventSource.SENSOR)
    for reading in scenario.sensors:
        payload = SensorEventPayload(
            sensor_id=reading.sensor_id,
            sensor_type=reading.sensor_type.value,
            value=reading.value,
            unit=reading.unit,
            status=reading.status.value,
        )
        published.append(
            sensor_publisher.publish(
                EventType.CREATED,
                payload=payload.as_dict(),
                zone=scenario.zone,
                correlation_id=scenario.name,
                occurred_at=DEMO_ANCHOR_TIME,
            )
        )

    worker_publisher = EventPublisher(dispatcher, source=EventSource.WORKER)
    for worker in scenario.workers:
        payload = WorkerEventPayload(
            worker_id=worker.worker_id,
            employee_id=worker.employee_id,
            status=worker.status.value,
            current_zone=scenario.zone,
        )
        published.append(
            worker_publisher.publish(
                EventType.UPDATED,
                payload=payload.as_dict(),
                zone=scenario.zone,
                correlation_id=scenario.name,
                occurred_at=DEMO_ANCHOR_TIME,
            )
        )

    permit_publisher = EventPublisher(dispatcher, source=EventSource.PERMIT)
    for permit in scenario.permits:
        payload = PermitEventPayload(
            permit_id=permit.permit_id,
            permit_type=permit.permit_type.value,
            status=permit.status.value,
        )
        published.append(
            permit_publisher.publish(
                EventType.CREATED,
                payload=payload.as_dict(),
                zone=scenario.zone,
                correlation_id=scenario.name,
                occurred_at=DEMO_ANCHOR_TIME,
            )
        )

    maintenance_publisher = EventPublisher(dispatcher, source=EventSource.MAINTENANCE)
    for log in scenario.maintenance_logs:
        payload = MaintenanceEventPayload(
            log_id=log.log_id,
            equipment_id=log.equipment_id,
            maintenance_type=log.maintenance_type.value,
            status=log.status.value,
        )
        published.append(
            maintenance_publisher.publish(
                EventType.CREATED,
                payload=payload.as_dict(),
                zone=scenario.zone,
                correlation_id=scenario.name,
                occurred_at=DEMO_ANCHOR_TIME,
            )
        )

    return published
