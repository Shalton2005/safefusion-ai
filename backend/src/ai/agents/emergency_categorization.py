"""Categorization logic for Emergency Response Engine output.

Kept as its own module, separate from :mod:`src.ai.agents.emergency_agent`,
so the "which action goes in which category" and "how urgent is this
zone" decisions are independently testable and reusable without needing
an :class:`~src.ai.agents.base.AgentRequest`/engine round-trip — the
agent module's only job is request/response glue (see
``emergency_agent.py``).

Every function here operates purely on already-computed
``ZoneEmergencyResponseResult``/``EmergencyActionMatch`` objects (see
``src.services.emergency_response.schemas``) — no engine calls, no I/O.
"""

from __future__ import annotations

from dataclasses import dataclass

from src.models.enums import EmergencyActionType, RiskLevel


# ── Action -> category table ─────────────────────────────────────────────────

# Which output category each predefined emergency action belongs to.
# Data, not branching logic — adding a new EmergencyActionType means
# adding one entry here, following the same lookup-table pattern used
# by RiskAgent's rule->recommendation table and GraphKnowledgeAgent's
# category keywords.
_IMMEDIATE_ACTIONS: frozenset[EmergencyActionType] = frozenset(
    {
        EmergencyActionType.EVACUATE_AREA,
        EmergencyActionType.STOP_WORK,
        EmergencyActionType.ISOLATE_EQUIPMENT,
        EmergencyActionType.SUSPEND_PERMIT,
    }
)

_NOTIFICATION_ACTIONS: frozenset[EmergencyActionType] = frozenset(
    {
        EmergencyActionType.NOTIFY_SAFETY_OFFICER,
        EmergencyActionType.NOTIFY_CONTROL_ROOM,
        EmergencyActionType.NOTIFY_FIRE_TEAM,
        EmergencyActionType.NOTIFY_MEDICAL_TEAM,
    }
)

_WORKFLOW_ACTIONS: frozenset[EmergencyActionType] = frozenset({EmergencyActionType.GENERATE_INCIDENT})

# Human-readable recipient for each notification action — what
# "Notifications" actually means as structured data, not just an
# action-type string.
_NOTIFICATION_RECIPIENTS: dict[EmergencyActionType, str] = {
    EmergencyActionType.NOTIFY_SAFETY_OFFICER: "Safety Officer",
    EmergencyActionType.NOTIFY_CONTROL_ROOM: "Control Room",
    EmergencyActionType.NOTIFY_FIRE_TEAM: "Fire Team",
    EmergencyActionType.NOTIFY_MEDICAL_TEAM: "Medical Team",
}

# Escalation tier per risk level — a coarser, human-facing severity
# label layered on top of the engine's raw score/level, independent of
# which specific actions fired.
_ESCALATION_TIER_BY_RISK_LEVEL: dict[RiskLevel, str] = {
    RiskLevel.LOW: "monitor",
    RiskLevel.MEDIUM: "supervisor_review",
    RiskLevel.HIGH: "site_management",
    RiskLevel.CRITICAL: "executive_and_regulatory",
}


# ── Structured output ─────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class ImmediateAction:
    """One physical/operational action to take right now."""

    zone: str
    action: str
    reason: str


@dataclass(frozen=True, slots=True)
class Notification:
    """One party to notify."""

    zone: str
    recipient: str
    action: str
    reason: str


@dataclass(frozen=True, slots=True)
class Escalation:
    """Escalation tier for a single zone."""

    zone: str
    risk_level: str
    risk_score: float
    tier: str
    reason: str


@dataclass(frozen=True, slots=True)
class IncidentWorkflowStep:
    """One incident-workflow action (currently: generate_incident)."""

    zone: str
    action: str
    reason: str


@dataclass(frozen=True, slots=True)
class EmergencyAssessment:
    """Structured emergency response output, grouped into the four requested categories."""

    immediate_actions: list[ImmediateAction]
    notifications: list[Notification]
    escalation: list[Escalation]
    incident_workflow: list[IncidentWorkflowStep]


# ── Categorization ────────────────────────────────────────────────────────────


def categorize(zone_results: list[object]) -> EmergencyAssessment:
    """Group Emergency Response Engine output into the four requested categories.

    Args:
        zone_results: ``list[ZoneEmergencyResponseResult]`` as returned
            by :meth:`~src.services.emergency_response.emergency_response_service.EmergencyResponseService.respond`.
    """
    immediate_actions: list[ImmediateAction] = []
    notifications: list[Notification] = []
    incident_workflow: list[IncidentWorkflowStep] = []

    for result in zone_results:
        for match in result.actions:
            if match.action in _IMMEDIATE_ACTIONS:
                immediate_actions.append(
                    ImmediateAction(zone=result.zone, action=match.action.value, reason=match.explanation)
                )
            elif match.action in _NOTIFICATION_ACTIONS:
                notifications.append(
                    Notification(
                        zone=result.zone,
                        recipient=_NOTIFICATION_RECIPIENTS[match.action],
                        action=match.action.value,
                        reason=match.explanation,
                    )
                )
            elif match.action in _WORKFLOW_ACTIONS:
                incident_workflow.append(
                    IncidentWorkflowStep(zone=result.zone, action=match.action.value, reason=match.explanation)
                )

    escalation = [_build_escalation(result) for result in zone_results]

    return EmergencyAssessment(
        immediate_actions=immediate_actions,
        notifications=notifications,
        escalation=escalation,
        incident_workflow=incident_workflow,
    )


def _build_escalation(result: object) -> Escalation:
    tier = _ESCALATION_TIER_BY_RISK_LEVEL.get(result.risk_level, "monitor")
    return Escalation(
        zone=result.zone,
        risk_level=result.risk_level.value,
        risk_score=result.risk_score,
        tier=tier,
        reason=(
            f"Zone '{result.zone}' is at {result.risk_level.value} risk "
            f"({result.risk_score:.2f}); escalate to {tier.replace('_', ' ')}."
        ),
    )
