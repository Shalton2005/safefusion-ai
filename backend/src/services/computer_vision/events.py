"""Publishes PPE Compliance Engine output onto the Unified Event Bus.

Lives in ``src.services.computer_vision`` (not
``src.services.event_bus.integrations``) to match the dependency
direction every other Day 13 domain package already uses: a producer
depends on the event bus, the event bus never depends on a producer. This
mirrors ``src.services.event_bus.integrations.SensorEventPublisherAdapter``
et al. — same shape, same one-adapter-per-domain pattern — just placed on
the CV side of that boundary since ``ComputerVisionEventPayload`` is
built directly from this package's own ``PPESafetyEvent``, not from an
ORM model with an existing lifecycle-hook protocol to implement.
"""

from __future__ import annotations

from src.services.computer_vision.compliance_schemas import FrameComplianceResult, PPESafetyEvent
from src.services.event_bus.payloads import ComputerVisionEventPayload
from src.services.event_bus.publisher import EventPublisher
from src.services.event_bus.schemas import Event, EventType

#: PPE rules always publish as DETECTED (a finding was observed this
#: frame), except a CRITICAL finding (e.g. smoke/fire) — those publish as
#: THRESHOLD_CROSSED, which the Timeline Service's severity classifier
#: (src.services.timeline.classification) already treats as a HIGH
#: minimum floor, keeping life-safety-critical CV findings from ever
#: being under-classified even if a rule's own severity were misconfigured.
_CRITICAL_EVENT_TYPE = EventType.THRESHOLD_CROSSED
_DEFAULT_EVENT_TYPE = EventType.DETECTED


class CameraEventPublisher:
    """Publishes each ``PPESafetyEvent`` the compliance engine produced as one ``Event``."""

    def __init__(self, publisher: EventPublisher) -> None:
        self._publisher = publisher

    def publish_event(self, safety_event: PPESafetyEvent) -> Event:
        """Publish a single ``PPESafetyEvent`` and return the resulting bus ``Event``."""
        payload = ComputerVisionEventPayload(
            camera_id=safety_event.camera_id,
            detection_label=safety_event.label.value,
            confidence=safety_event.confidence,
            status=safety_event.severity.value,
            bounding_box=safety_event.bounding_box.as_tuple() if safety_event.bounding_box else None,
            zone=safety_event.zone,
            rule_name=safety_event.rule_name,
        )
        event_type = _CRITICAL_EVENT_TYPE if safety_event.severity.value == "critical" else _DEFAULT_EVENT_TYPE
        return self._publisher.publish(
            event_type,
            payload=payload.as_dict(),
            zone=safety_event.zone,
            occurred_at=safety_event.captured_at,
        )

    def publish_frame_result(self, result: FrameComplianceResult) -> list[Event]:
        """Publish every safety event in one frame's compliance result, in order."""
        return [self.publish_event(safety_event) for safety_event in result.events]
