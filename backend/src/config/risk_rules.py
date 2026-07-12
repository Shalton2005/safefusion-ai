"""Centralised risk rule configuration for SafeFusion AI.

Every risk weight used by the rule-based risk engines (per-zone
``RiskScoreEngine`` and ``CompoundRiskEngine``) is declared here as a
:class:`RiskRuleConfig`, collected into a single flat registry keyed by
rule name. Values default from :data:`src.config.settings.settings`
(so ``.env`` / environment variables still override them), but this
module is the one place that names, documents, and enumerates every
rule — services and routes must not hardcode weights or thresholds of
their own.

To add a new rule:
    1. Add a ``RISK_WEIGHT_...`` (or ``COMPOUND_RISK_POINTS_...``)
       field to ``Settings`` with its default value.
    2. Add a ``RiskRuleConfig`` entry to the relevant registry below.
    3. Reference the new entry by name when wiring up the engine's
       factor/rule instance — no other file needs to know the number.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from src.config.settings import settings


@dataclass(frozen=True)
class RiskRuleConfig:
    """A single named, weighted risk rule.

    Attributes:
        name: Stable machine-readable identifier for the rule (used as
            the factor/rule's reported ``name``/``rule_name``).
        points: Point contribution (out of 100) applied when the rule
            fires. For proportional factors this is the maximum
            contribution; for compound (boolean) rules it is the flat
            contribution.
        description: Human-readable summary of what the rule detects.
        params: Extra configuration the rule constructor needs beyond
            ``points`` (e.g. ``restricted_zones``, ``minimum_warning_count``).
    """

    name: str
    points: float
    description: str
    params: dict = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────
# Per-zone weighted Risk Score Engine rules (src.services.risk_scoring)
# ─────────────────────────────────────────────────────────────────────────
RISK_SCORE_RULES: dict[str, RiskRuleConfig] = {
    "critical_sensors": RiskRuleConfig(
        name="critical_sensors",
        points=settings.RISK_WEIGHT_CRITICAL_SENSORS,
        description="Proportion of critical-status sensor readings in a zone (e.g. Gas Critical).",
    ),
    "warning_sensors": RiskRuleConfig(
        name="warning_sensors",
        points=settings.RISK_WEIGHT_WARNING_SENSORS,
        description="Proportion of warning-status sensor readings in a zone (e.g. Temperature High).",
    ),
    "expired_permits": RiskRuleConfig(
        name="expired_permits",
        points=settings.RISK_WEIGHT_EXPIRED_PERMITS,
        description="Proportion of expired permits in a zone (Expired Permit).",
    ),
    "restricted_zone_workers": RiskRuleConfig(
        name="restricted_zone_workers",
        points=settings.RISK_WEIGHT_RESTRICTED_ZONE_WORKERS,
        description="Proportion of workers present in a configured restricted zone (Worker in Zone).",
        params={"restricted_zones": set(settings.ALERT_RESTRICTED_ZONES)},
    ),
}

RISK_SCORE_LEVEL_BANDS: dict[str, float] = {
    "low_max": settings.RISK_LEVEL_LOW_MAX,
    "medium_max": settings.RISK_LEVEL_MEDIUM_MAX,
    "high_max": settings.RISK_LEVEL_HIGH_MAX,
}


# ─────────────────────────────────────────────────────────────────────────
# Compound Risk Engine rules (src.services.compound_risk)
# ─────────────────────────────────────────────────────────────────────────
COMPOUND_RISK_RULES: dict[str, RiskRuleConfig] = {
    "critical_sensor_without_active_permit": RiskRuleConfig(
        name="critical_sensor_without_active_permit",
        points=settings.COMPOUND_RISK_POINTS_CRITICAL_SENSOR_WITHOUT_PERMIT,
        description="Gas/other sensor critical in a zone with no valid active permit.",
    ),
    "expired_permit_with_worker_present": RiskRuleConfig(
        name="expired_permit_with_worker_present",
        points=settings.COMPOUND_RISK_POINTS_EXPIRED_PERMIT_WITH_WORKER,
        description="Expired Permit while a worker remains assigned to the zone.",
    ),
    "critical_sensor_with_worker_present": RiskRuleConfig(
        name="critical_sensor_with_worker_present",
        points=settings.COMPOUND_RISK_POINTS_CRITICAL_SENSOR_WITH_WORKER,
        description="Gas Critical (or other critical sensor) with a worker physically present.",
    ),
    "restricted_zone_without_active_permit": RiskRuleConfig(
        name="restricted_zone_without_active_permit",
        points=settings.COMPOUND_RISK_POINTS_RESTRICTED_ZONE_WITHOUT_PERMIT,
        description="Worker in Zone for a restricted zone with no valid active permit.",
        params={"restricted_zones": set(settings.ALERT_RESTRICTED_ZONES)},
    ),
    "multiple_warning_sensors": RiskRuleConfig(
        name="multiple_warning_sensors",
        points=settings.COMPOUND_RISK_POINTS_MULTIPLE_WARNING_SENSORS,
        description="Several simultaneous warning-level sensor readings in one zone (e.g. Temperature High).",
        params={"minimum_warning_count": settings.COMPOUND_RISK_MULTIPLE_WARNING_MIN_COUNT},
    ),
}

COMPOUND_RISK_LEVEL_BANDS: dict[str, float] = {
    "low_max": settings.COMPOUND_RISK_LEVEL_LOW_MAX,
    "medium_max": settings.COMPOUND_RISK_LEVEL_MEDIUM_MAX,
    "high_max": settings.COMPOUND_RISK_LEVEL_HIGH_MAX,
}


# ─────────────────────────────────────────────────────────────────────────
# Emergency Response Engine rules (src.services.emergency_response)
# ─────────────────────────────────────────────────────────────────────────
# Each entry maps a zone compound-risk score (0-100) threshold to the
# predefined emergency action it dispatches once a zone's score reaches
# it. A zone can trigger several actions at once — thresholds are
# independent, not mutually exclusive bands. To add a new action, add an
# ``EMERGENCY_THRESHOLD_...`` field to ``Settings`` and a matching
# ``RiskRuleConfig`` entry here; no other file needs to know the number.
EMERGENCY_RESPONSE_RULES: dict[str, RiskRuleConfig] = {
    "notify_safety_officer": RiskRuleConfig(
        name="notify_safety_officer",
        points=settings.EMERGENCY_THRESHOLD_NOTIFY_SAFETY_OFFICER,
        description="Zone compound risk score has reached a level warranting safety officer awareness.",
    ),
    "notify_control_room": RiskRuleConfig(
        name="notify_control_room",
        points=settings.EMERGENCY_THRESHOLD_NOTIFY_CONTROL_ROOM,
        description="Zone compound risk score requires control room situational awareness.",
    ),
    "stop_work": RiskRuleConfig(
        name="stop_work",
        points=settings.EMERGENCY_THRESHOLD_STOP_WORK,
        description="Zone compound risk score requires halting active work in the zone.",
    ),
    "isolate_equipment": RiskRuleConfig(
        name="isolate_equipment",
        points=settings.EMERGENCY_THRESHOLD_ISOLATE_EQUIPMENT,
        description="Zone compound risk score requires isolating equipment to prevent escalation.",
    ),
    "evacuate_area": RiskRuleConfig(
        name="evacuate_area",
        points=settings.EMERGENCY_THRESHOLD_EVACUATE_AREA,
        description="Zone compound risk score requires evacuating all personnel from the zone.",
    ),
    "generate_incident": RiskRuleConfig(
        name="generate_incident",
        points=settings.EMERGENCY_THRESHOLD_GENERATE_INCIDENT,
        description="Zone compound risk score requires an incident record to be opened automatically.",
    ),
}
