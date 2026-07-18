"""Per-domain payload shapes for the Unified Event Bus.

These dataclasses are a convenience, not a requirement: ``Event.payload``
is a plain ``dict``, so a publisher can hand-build one. Using the matching
payload dataclass's ``as_dict()`` just keeps the dict shape consistent for
every event with the same ``(source, event_type)``, which is what lets a
subscriber safely destructure ``event.payload`` without re-deriving the
schema from call sites.

Each dataclass takes only primitives/UUIDs/strings — never an ORM model —
so this module has no SQLAlchemy dependency, matching the framework-
agnostic design of ``src.services.sensor_simulator`` and
``src.services.dataset_generation``.
"""

from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass
from typing import Any


class EventPayload:
    """Mixin providing a uniform, dict-safe ``as_dict()`` for payloads."""

    def as_dict(self) -> dict[str, Any]:
        return {key: (str(value) if isinstance(value, uuid.UUID) else value) for key, value in asdict(self).items()}


@dataclass(frozen=True)
class SensorEventPayload(EventPayload):
    sensor_id: uuid.UUID
    sensor_type: str
    value: float
    unit: str
    status: str


@dataclass(frozen=True)
class WorkerEventPayload(EventPayload):
    worker_id: uuid.UUID
    employee_id: str
    status: str
    current_zone: str | None = None


@dataclass(frozen=True)
class PermitEventPayload(EventPayload):
    permit_id: uuid.UUID
    permit_type: str
    status: str


@dataclass(frozen=True)
class MaintenanceEventPayload(EventPayload):
    log_id: uuid.UUID
    equipment_id: str
    maintenance_type: str
    status: str


@dataclass(frozen=True)
class ComputerVisionEventPayload(EventPayload):
    """Payload for a Computer Vision / PPE Compliance Engine finding.

    Produced by ``src.services.computer_vision``'s
    ``CameraEventPublisherAdapter`` from one
    ``src.services.computer_vision.compliance_schemas.PPESafetyEvent``.
    Modeled on the kind of frame-level detection output a PPE-compliance
    or intrusion-detection CV model emits: what was detected, where, and
    how confident the model was.

    Attributes:
        status: The PPE compliance rule's severity, lowercased (e.g.
            ``"critical"``, ``"high"``) — mirrors every other domain
            payload's ``status`` field (see
            ``src.services.timeline.classification._STATUS_SEVERITY``),
            so the Timeline Service classifies CV events by the same
            mechanism as sensor/permit/worker/maintenance events instead
            of needing CV-specific handling.
    """

    camera_id: str
    detection_label: str
    confidence: float
    status: str
    bounding_box: tuple[float, float, float, float] | None = None
    zone: str | None = None
    rule_name: str | None = None
