"""Centralised recommendation rule configuration for SafeFusion AI.

Every priority weight and message template used by the Recommendation
Service (:mod:`src.services.recommendation`) is declared here — the one
place that names, documents, and enumerates how raw engine output
(Compound Risk, Emergency Response, Compliance) becomes an ordered,
human-readable operator recommendation. Services and routes must not
hardcode priority numbers or message wording of their own.

Ordering model:
    Each recommendation gets a numeric ``priority`` — **lower sorts
    first**. Priority is computed as::

        source_priority + severity_offset

    ``source_priority`` (below) encodes the fixed source ranking
    (Emergency Response actions are immediate/operational and rank above
    Compound Risk findings, which rank above Compliance follow-up).
    ``severity_offset`` (also below) refines ordering *within* a source by
    how severe the underlying condition was, so e.g. a CRITICAL compound
    risk finding still outranks a LOW one, without ever crossing into
    another source's priority band (each band spans 0-3, bands are 100
    apart, so no combination of source + severity can cross a band).

To add a new rule:
    1. If introducing a new engine as a recommendation source, add a
       ``RecommendationSource`` member (``src/models/enums.py``) and a
       ``SOURCE_PRIORITY`` entry below.
    2. Add a message template — a plain ``str.format``-style string keyed
       by whatever identifies the condition (action type, rule name,
       framework) — to the relevant ``*_MESSAGE_TEMPLATES`` dict.
"""

from __future__ import annotations

from src.models.enums import ComplianceFramework, EmergencyActionType, RecommendationSource, RiskLevel

# ─────────────────────────────────────────────────────────────────────────
# Source priority (lower sorts first) — fixed life-safety-first ordering.
# Bands are spaced 100 apart so severity offsets (0-30) never overlap.
# ─────────────────────────────────────────────────────────────────────────
SOURCE_PRIORITY: dict[RecommendationSource, int] = {
    RecommendationSource.EMERGENCY_RESPONSE: 0,
    RecommendationSource.COMPOUND_RISK: 100,
    RecommendationSource.COMPLIANCE: 200,
}

# ─────────────────────────────────────────────────────────────────────────
# Severity offset (lower sorts first within a source's priority band).
# ─────────────────────────────────────────────────────────────────────────
RISK_LEVEL_SEVERITY_OFFSET: dict[RiskLevel, int] = {
    RiskLevel.CRITICAL: 0,
    RiskLevel.HIGH: 10,
    RiskLevel.MEDIUM: 20,
    RiskLevel.LOW: 30,
}

# Emergency actions are already life-safety-ordered by the Emergency
# Response Engine's own dispatch order; this offset just keeps the more
# severe action types first when recommendations from different zones
# interleave.
EMERGENCY_ACTION_SEVERITY_OFFSET: dict[EmergencyActionType, int] = {
    EmergencyActionType.EVACUATE_AREA: 0,
    EmergencyActionType.STOP_WORK: 1,
    EmergencyActionType.ISOLATE_EQUIPMENT: 2,
    EmergencyActionType.NOTIFY_FIRE_TEAM: 3,
    EmergencyActionType.NOTIFY_MEDICAL_TEAM: 3,
    EmergencyActionType.NOTIFY_SAFETY_OFFICER: 4,
    EmergencyActionType.NOTIFY_CONTROL_ROOM: 4,
    EmergencyActionType.SUSPEND_PERMIT: 5,
    EmergencyActionType.GENERATE_INCIDENT: 6,
}

COMPLIANCE_FRAMEWORK_SEVERITY_OFFSET: dict[ComplianceFramework, int] = {
    ComplianceFramework.DGMS: 0,
    ComplianceFramework.OISD: 1,
    ComplianceFramework.FACTORY_ACT: 2,
}

# ─────────────────────────────────────────────────────────────────────────
# Message templates
# ─────────────────────────────────────────────────────────────────────────
# Compound Risk: keyed by RiskLevel — operator guidance for a zone's
# overall compound risk classification.
COMPOUND_RISK_MESSAGE_TEMPLATES: dict[RiskLevel, str] = {
    RiskLevel.CRITICAL: "Zone '{zone}' is at CRITICAL compound risk ({risk_score:.0f}/100). Escalate immediately and confirm emergency response actions are in progress.",
    RiskLevel.HIGH: "Zone '{zone}' is at HIGH compound risk ({risk_score:.0f}/100). Increase monitoring frequency and prepare to restrict access.",
    RiskLevel.MEDIUM: "Zone '{zone}' is at MEDIUM compound risk ({risk_score:.0f}/100). Review triggered conditions and verify permits/PPE compliance.",
    RiskLevel.LOW: "Zone '{zone}' is at LOW compound risk ({risk_score:.0f}/100). No immediate action required; continue routine monitoring.",
}

# Emergency Response: keyed by EmergencyActionType — the operator-facing
# instruction for a dispatched action.
EMERGENCY_ACTION_MESSAGE_TEMPLATES: dict[EmergencyActionType, str] = {
    EmergencyActionType.EVACUATE_AREA: "Evacuate all personnel from zone '{zone}' immediately.",
    EmergencyActionType.STOP_WORK: "Stop all active work in zone '{zone}' until conditions are cleared.",
    EmergencyActionType.ISOLATE_EQUIPMENT: "Isolate equipment in zone '{zone}' to prevent escalation.",
    EmergencyActionType.NOTIFY_SAFETY_OFFICER: "Notify the safety officer about conditions in zone '{zone}'.",
    EmergencyActionType.NOTIFY_CONTROL_ROOM: "Notify the control room about conditions in zone '{zone}'.",
    EmergencyActionType.NOTIFY_FIRE_TEAM: "Notify the fire response team for zone '{zone}'.",
    EmergencyActionType.NOTIFY_MEDICAL_TEAM: "Notify the medical response team for zone '{zone}'.",
    EmergencyActionType.SUSPEND_PERMIT: "Suspend the active work permit covering zone '{zone}'.",
    EmergencyActionType.GENERATE_INCIDENT: "Review the auto-generated incident record for zone '{zone}'.",
}

# Compliance: generic template applied to every violation — the rule's own
# ``recommendation`` field (already operator-facing) supplies the
# corrective action; this template just adds the regulatory framing.
COMPLIANCE_MESSAGE_TEMPLATE = "[{framework}] {recommendation} (rule: {title})"
