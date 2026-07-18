"""Unified event model for SafeFusion AI.

Every backend module — Sensors, Workers, Permits, Maintenance, and future
Computer Vision detections — publishes through this one schema. A single
shared envelope (:class:`Event`) means a dispatcher/subscriber never needs
to know the producing module's internal shape; it only needs
``event.source``, ``event.event_type``, and ``event.payload``.

Design notes:
    - ``EventSource`` is the extensible enum of publishing modules. Adding
      Computer Vision support later means adding one member here (already
      done — see ``COMPUTER_VISION``) plus a payload dataclass; no change
      to the publisher or dispatcher is required.
    - ``EventType`` is deliberately coarse-grained (created/updated/deleted/
      threshold_crossed/detected) rather than one enum member per domain
      action, so new domains slot into the existing vocabulary instead of
      growing it unboundedly.
    - ``payload`` is an untyped ``dict`` at the envelope level (mirroring
      how ``src.services.compound_risk`` passes ``dict`` summaries between
      services) so the envelope itself has zero coupling to any domain
      model. Per-domain payload dataclasses below exist for producers to
      build that dict consistently, via their own ``as_dict()``.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class EventSource(str, Enum):
    """Backend module that produced an event.

    New producers (e.g. a future Computer Vision pipeline) add a member
    here and nowhere else in this module.
    """

    SENSOR = "sensor"
    WORKER = "worker"
    PERMIT = "permit"
    MAINTENANCE = "maintenance"
    COMPUTER_VISION = "computer_vision"


class EventType(str, Enum):
    """Lifecycle/occurrence category of an event, independent of its source."""

    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    THRESHOLD_CROSSED = "threshold_crossed"
    DETECTED = "detected"


@dataclass(frozen=True)
class Event:
    """The single envelope every publisher emits and every subscriber receives.

    Attributes:
        event_id: Unique identifier for this occurrence, generated at
            creation time — lets subscribers de-duplicate deliveries.
        source: Which module produced the event.
        event_type: What kind of occurrence this is.
        payload: Domain-specific data. Producers should build this via one
            of the ``*Payload`` dataclasses' ``as_dict()`` in this module
            (or an equivalent for a new domain) so the shape stays
            consistent within a given ``(source, event_type)`` pair.
        zone: Plant zone the event concerns, when applicable. Hoisted out
            of ``payload`` to the envelope because zone is the one
            dimension nearly every existing engine (compound risk,
            emergency response, monitoring) filters/groups by — keeping
            it here lets a subscriber route or filter without inspecting
            ``payload``.
        occurred_at: When the underlying event happened. Defaults to now;
            pass explicitly when replaying or backfilling.
        correlation_id: Opaque identifier for tracing one causal chain
            across multiple published events (e.g. a sensor threshold
            crossing that leads to a later alert event). Optional —
            producers that don't need tracing can omit it.
    """

    source: EventSource
    event_type: EventType
    payload: dict[str, Any] = field(default_factory=dict)
    zone: str | None = None
    event_id: uuid.UUID = field(default_factory=uuid.uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: str | None = None

    def as_dict(self) -> dict[str, Any]:
        """JSON-safe representation, e.g. for logging or an outbound queue."""
        return {
            "event_id": str(self.event_id),
            "source": self.source.value,
            "event_type": self.event_type.value,
            "payload": self.payload,
            "zone": self.zone,
            "occurred_at": self.occurred_at.isoformat(),
            "correlation_id": self.correlation_id,
        }
