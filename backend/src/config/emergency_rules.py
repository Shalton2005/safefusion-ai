"""Configurable emergency response rules for SafeFusion AI.

Maps named hazard conditions (:class:`~src.models.enums.EmergencyCondition`)
to the predefined emergency actions
(:class:`~src.models.enums.EmergencyActionType`) that should be dispatched
when that condition is detected. This module is the single source of
truth for that mapping — it deliberately holds no detection logic (no
sensor thresholds, no permit/worker queries): it only answers "given this
condition fired, what actions follow?" Detection of *whether* a condition
fired belongs to the monitoring/compound-risk services; dispatching the
resulting actions belongs to
:class:`~src.services.emergency_response.emergency_response_service.EmergencyResponseService`.

A condition can map to one or many actions, and the same action can be
reused across multiple conditions.

To add a new rule:
    1. If the condition is new, add it to ``EmergencyCondition`` in
       ``src/models/enums.py``.
    2. If an action is new, add it to ``EmergencyActionType`` in the same
       file.
    3. Add (or extend) an ``EmergencyRule`` entry in
       ``CONDITION_ACTION_RULES`` below, keyed by the condition.

No other file should hardcode a condition-to-action mapping.

Note: this registry is intentionally named differently from
``src.config.risk_rules.EMERGENCY_RESPONSE_RULES`` (a differently-shaped,
score-threshold-keyed registry actually wired into
``src.routes.emergency_response``), to avoid two same-named registries
existing in different modules — a collision risk for anyone importing
the wrong one.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from src.models.enums import EmergencyActionType, EmergencyCondition


@dataclass(frozen=True)
class EmergencyRule:
    """A named hazard condition and the emergency actions it triggers.

    Attributes:
        condition: The hazard condition this rule responds to.
        actions: Ordered list of predefined actions to dispatch, in the
            order they should be executed (e.g. life-safety actions like
            evacuation before administrative ones like suspending a permit).
        description: Human-readable summary of the condition, for
            documentation and API responses.
    """

    condition: EmergencyCondition
    actions: tuple[EmergencyActionType, ...]
    description: str


# ─────────────────────────────────────────────────────────────────────────
# Emergency Response rule registry (src.services.emergency_response)
# ─────────────────────────────────────────────────────────────────────────
# Keyed by EmergencyCondition so callers look up actions with
# ``CONDITION_ACTION_RULES[condition].actions`` rather than a raw string.
CONDITION_ACTION_RULES: dict[EmergencyCondition, EmergencyRule] = {
    EmergencyCondition.CRITICAL_GAS: EmergencyRule(
        condition=EmergencyCondition.CRITICAL_GAS,
        actions=(
            EmergencyActionType.EVACUATE_AREA,
            EmergencyActionType.STOP_WORK,
        ),
        description="Gas sensor reading has reached a critical level in the zone.",
    ),
    EmergencyCondition.FIRE: EmergencyRule(
        condition=EmergencyCondition.FIRE,
        actions=(
            EmergencyActionType.EVACUATE_AREA,
            EmergencyActionType.NOTIFY_FIRE_TEAM,
        ),
        description="Fire detected in the zone.",
    ),
    EmergencyCondition.EXPIRED_PERMIT: EmergencyRule(
        condition=EmergencyCondition.EXPIRED_PERMIT,
        actions=(EmergencyActionType.SUSPEND_PERMIT,),
        description="A permit covering the zone has expired.",
    ),
    EmergencyCondition.WORKER_DOWN: EmergencyRule(
        condition=EmergencyCondition.WORKER_DOWN,
        actions=(EmergencyActionType.NOTIFY_MEDICAL_TEAM,),
        description="A worker in the zone is reporting as down/unresponsive.",
    ),
}


def get_actions_for(condition: EmergencyCondition) -> tuple[EmergencyActionType, ...]:
    """Return the predefined actions for ``condition``, or an empty tuple if unmapped."""
    rule = CONDITION_ACTION_RULES.get(condition)
    return rule.actions if rule else ()
