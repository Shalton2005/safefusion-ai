"""Derives severity and an AI-decision reference from a published Event.

``Event`` (``src.services.event_bus.schemas``) has neither field today —
this module is where that gap is bridged, kept separate from persistence
(``service.py``) so the classification rules are independently testable
and swappable without touching how records are stored.

Severity is derived from ``event.payload["status"]`` where present (the
per-domain payload dataclasses in ``src.services.event_bus.payloads`` all
carry a ``status`` string — sensor/permit/maintenance use
normal/warning/critical-style values, worker uses working/idle/emergency)
via a small configurable mapping, falling back to ``EventType``-based
defaults (e.g. ``DELETED`` is always at least MEDIUM — losing a record is
never purely informational) when no recognized status is present.
"""

from __future__ import annotations

from src.models.enums import SeverityLevel
from src.services.event_bus.schemas import Event, EventType

#: Maps a payload's ``status`` string to a severity. Covers every status
#: value produced by the current domain payloads (sensor/permit/
#: maintenance: normal/warning/critical/degraded/healthy/at_risk/active/
#: expired/suspended/closed; worker: working/idle/emergency).
_STATUS_SEVERITY: dict[str, SeverityLevel] = {
    "normal": SeverityLevel.LOW,
    "healthy": SeverityLevel.LOW,
    "working": SeverityLevel.LOW,
    "active": SeverityLevel.LOW,
    "closed": SeverityLevel.LOW,
    "valid": SeverityLevel.LOW,
    "idle": SeverityLevel.LOW,
    "planned": SeverityLevel.LOW,
    "completed": SeverityLevel.LOW,
    "at_risk": SeverityLevel.MEDIUM,
    "pending": SeverityLevel.MEDIUM,
    "ongoing": SeverityLevel.MEDIUM,
    "warning": SeverityLevel.MEDIUM,
    "suspended": SeverityLevel.HIGH,
    "expired": SeverityLevel.HIGH,
    "degraded": SeverityLevel.HIGH,
    "invalid": SeverityLevel.HIGH,
    "emergency": SeverityLevel.CRITICAL,
    "critical": SeverityLevel.CRITICAL,
}

#: Minimum severity implied by the event type alone, applied when the
#: payload's status doesn't resolve to a higher severity.
_EVENT_TYPE_MINIMUM_SEVERITY: dict[EventType, SeverityLevel] = {
    EventType.DELETED: SeverityLevel.MEDIUM,
    EventType.THRESHOLD_CROSSED: SeverityLevel.HIGH,
    EventType.DETECTED: SeverityLevel.MEDIUM,
}

_SEVERITY_RANK: dict[SeverityLevel, int] = {
    SeverityLevel.LOW: 0,
    SeverityLevel.MEDIUM: 1,
    SeverityLevel.HIGH: 2,
    SeverityLevel.CRITICAL: 3,
}


def classify_severity(event: Event) -> SeverityLevel:
    """Return the severity this event should be recorded with.

    Combines a status-derived severity (from ``event.payload["status"]``,
    if present and recognized) with a per-``EventType`` floor, taking
    whichever is higher — an event type carrying inherent urgency (e.g.
    ``THRESHOLD_CROSSED``) is never under-classified just because its
    payload's status string wasn't recognized.
    """
    status = event.payload.get("status")
    status_severity = _STATUS_SEVERITY.get(status) if isinstance(status, str) else None

    type_minimum = _EVENT_TYPE_MINIMUM_SEVERITY.get(event.event_type, SeverityLevel.LOW)

    if status_severity is None:
        return type_minimum

    if _SEVERITY_RANK[status_severity] >= _SEVERITY_RANK[type_minimum]:
        return status_severity
    return type_minimum


def extract_ai_decision_reference(event: Event) -> str | None:
    """Return a free-form reference linking this event to an AI decision, if any.

    No persisted "AI decision" entity exists in this codebase (recommendations,
    compound-risk results, and explainability reports are all computed
    in-memory with no stored id) — this function looks for a caller-supplied
    reference in the payload under either ``ai_decision_reference`` or
    ``recommendation_reason`` (the closest thing
    ``src.services.recommendation.schemas.Recommendation`` has to an
    identifier: its ``reason`` field), so a publisher that already knows
    which recommendation/rule drove this event can surface that link without
    this module needing to know about the recommendation engine.
    """
    reference = event.payload.get("ai_decision_reference")
    if isinstance(reference, str) and reference:
        return reference

    reason = event.payload.get("recommendation_reason")
    if isinstance(reason, str) and reason:
        return reason

    return None
