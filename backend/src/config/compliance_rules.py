"""Centralised compliance rule configuration for SafeFusion AI.

Every rule evaluated by the Compliance Rule Engine
(:mod:`src.services.compliance`) is declared here as a
:class:`ComplianceRuleConfig`, collected into a single flat registry keyed
by rule code. This module is the one place that names, documents, and
enumerates every compliance rule — services and routes must not hardcode
regulatory conditions or recommendations of their own.

Each rule maps an :class:`~src.models.enums.IncidentType`/
:class:`~src.models.enums.SeverityLevel` condition observed on a detected
incident to the regulatory framework it falls under
(:class:`~src.models.enums.ComplianceFramework`: Factory Act, OISD, DGMS),
a human-readable violation description, and a recommended corrective
action. Matching is purely rule-based (attribute comparisons) — no AI/ML.

To add a new rule:
    1. Add a ``ComplianceRuleConfig`` entry to ``COMPLIANCE_RULES`` below
       with a unique ``code``.
    2. Reference the new entry by code when the engine reports a
       violation — no other file needs to know the condition or wording.
"""

from __future__ import annotations

from dataclasses import dataclass

from src.models.enums import ComplianceFramework, IncidentType, SeverityLevel


@dataclass(frozen=True)
class ComplianceRuleConfig:
    """A single named compliance rule evaluated against a detected incident.

    Attributes:
        code: Stable machine-readable identifier for the rule.
        framework: The regulatory framework this rule enforces.
        title: Short human-readable name of the rule (e.g. what statute/
            clause it represents).
        description: What the rule checks for and why it matters.
        applies_to_incident_types: Incident types this rule evaluates.
            Empty means "any incident type."
        minimum_severity: The minimum ``SeverityLevel`` (inclusive) at
            which this rule is considered violated. ``None`` means
            severity is not part of the condition.
        recommendation: Corrective action recommended when this rule is
            violated.
    """

    code: str
    framework: ComplianceFramework
    title: str
    description: str
    applies_to_incident_types: tuple[IncidentType, ...]
    minimum_severity: SeverityLevel | None
    recommendation: str


_SEVERITY_ORDER: dict[SeverityLevel, int] = {
    SeverityLevel.LOW: 0,
    SeverityLevel.MEDIUM: 1,
    SeverityLevel.HIGH: 2,
    SeverityLevel.CRITICAL: 3,
}


def severity_at_least(severity: SeverityLevel, minimum: SeverityLevel) -> bool:
    """Return ``True`` if ``severity`` is at or above ``minimum`` on the standard scale."""
    return _SEVERITY_ORDER[severity] >= _SEVERITY_ORDER[minimum]


# ─────────────────────────────────────────────────────────────────────────
# Compliance Rule Engine registry (src.services.compliance)
# ─────────────────────────────────────────────────────────────────────────
COMPLIANCE_RULES: dict[str, ComplianceRuleConfig] = {
    "factory_act_gas_leak_reporting": ComplianceRuleConfig(
        code="factory_act_gas_leak_reporting",
        framework=ComplianceFramework.FACTORY_ACT,
        title="Hazardous Gas Leak Reporting (Factories Act)",
        description=(
            "Any gas leak incident must be reported and investigated under "
            "occupier safety obligations for hazardous substances."
        ),
        applies_to_incident_types=(IncidentType.GAS_LEAK,),
        minimum_severity=None,
        recommendation=(
            "File a hazardous-substance incident report and notify the "
            "occupier/safety officer within the statutory reporting window."
        ),
    ),
    "factory_act_fire_safety": ComplianceRuleConfig(
        code="factory_act_fire_safety",
        framework=ComplianceFramework.FACTORY_ACT,
        title="Fire Safety Measures (Factories Act)",
        description=(
            "Fire incidents indicate a potential lapse in mandated fire "
            "prevention and firefighting arrangements."
        ),
        applies_to_incident_types=(IncidentType.FIRE, IncidentType.EXPLOSION),
        minimum_severity=None,
        recommendation=(
            "Inspect firefighting equipment and evacuation routes; "
            "document findings in the fire safety register."
        ),
    ),
    "factory_act_ppe_compliance": ComplianceRuleConfig(
        code="factory_act_ppe_compliance",
        framework=ComplianceFramework.FACTORY_ACT,
        title="Personal Protective Equipment Compliance (Factories Act)",
        description="Workers must use prescribed PPE while on the factory floor.",
        applies_to_incident_types=(IncidentType.PPE_VIOLATION,),
        minimum_severity=None,
        recommendation="Retrain affected worker(s) on PPE requirements and log the violation.",
    ),
    "oisd_major_hazard_severity": ComplianceRuleConfig(
        code="oisd_major_hazard_severity",
        framework=ComplianceFramework.OISD,
        title="Major Hazard Incident Escalation (OISD)",
        description=(
            "OISD process safety standards require high/critical severity "
            "incidents involving fire, explosion, or gas release to be "
            "escalated as major hazard events."
        ),
        applies_to_incident_types=(IncidentType.GAS_LEAK, IncidentType.FIRE, IncidentType.EXPLOSION),
        minimum_severity=SeverityLevel.HIGH,
        recommendation=(
            "Escalate as a major hazard event, convene the incident review "
            "board, and initiate a root-cause investigation per OISD guidelines."
        ),
    ),
    "oisd_explosion_process_safety_review": ComplianceRuleConfig(
        code="oisd_explosion_process_safety_review",
        framework=ComplianceFramework.OISD,
        title="Process Safety Review After Explosion (OISD)",
        description="Any explosion triggers a mandatory process safety management review.",
        applies_to_incident_types=(IncidentType.EXPLOSION,),
        minimum_severity=None,
        recommendation="Initiate a formal process safety management (PSM) review before resuming operations.",
    ),
    "dgms_critical_incident_notification": ComplianceRuleConfig(
        code="dgms_critical_incident_notification",
        framework=ComplianceFramework.DGMS,
        title="Critical Incident Notification (DGMS)",
        description=(
            "Directorate General of Mines Safety regulations require "
            "critical-severity incidents to be notified to the regional "
            "authority without delay."
        ),
        applies_to_incident_types=(),
        minimum_severity=SeverityLevel.CRITICAL,
        recommendation=(
            "Notify the DGMS regional office within the mandated timeframe "
            "and preserve the incident site for inspection."
        ),
    ),
    "dgms_emergency_response_review": ComplianceRuleConfig(
        code="dgms_emergency_response_review",
        framework=ComplianceFramework.DGMS,
        title="Emergency Response Adequacy Review (DGMS)",
        description=(
            "Incidents that triggered automated emergency response actions "
            "must be reviewed for emergency preparedness adequacy under "
            "DGMS mine safety codes."
        ),
        applies_to_incident_types=(IncidentType.EMERGENCY_RESPONSE,),
        minimum_severity=None,
        recommendation=(
            "Review emergency response effectiveness and update the site "
            "emergency preparedness plan if gaps are identified."
        ),
    ),
}
