"""Configurable emergency response rules for SafeFusion AI.

Each rule inspects a zone's ``ZoneCompoundRiskResult`` (the output of the
Compound Risk Engine) and decides whether its predefined emergency action
should be dispatched for that zone. Rules are pure, stateless, and
threshold-based — no AI/ML involved — following the same ``Protocol``
strategy pattern used by ``src.services.compound_risk``.
"""

from __future__ import annotations

from typing import Protocol

from src.models.enums import EmergencyActionType
from src.services.compound_risk.schemas import ZoneCompoundRiskResult
from src.services.emergency_response.schemas import EmergencyActionMatch


class EmergencyResponseRule(Protocol):
    """Contract implemented by every emergency response rule.

    A rule inspects a zone's compound risk result and returns a match if
    its action should be dispatched for that zone, or ``None`` otherwise.
    """

    def evaluate(self, zone_result: ZoneCompoundRiskResult) -> EmergencyActionMatch | None: ...


class ThresholdEmergencyResponseRule:
    """Dispatches a fixed action once a zone's compound risk score reaches a threshold.

    This single, generic rule implementation covers every predefined
    action (Evacuate Area, Stop Work, Isolate Equipment, Notify Safety
    Officer, Notify Control Room, Generate Incident) — actions differ only
    by their configured action type, threshold, and rule name, all of
    which are supplied by the caller from the centralised rule registry.
    """

    def __init__(self, rule_name: str, action: EmergencyActionType, threshold: float) -> None:
        self._rule_name = rule_name
        self._action = action
        self._threshold = threshold

    def evaluate(self, zone_result: ZoneCompoundRiskResult) -> EmergencyActionMatch | None:
        if zone_result.risk_score < self._threshold:
            return None
        return EmergencyActionMatch(
            action=self._action,
            triggered_by_rule=self._rule_name,
            explanation=(
                f"Zone '{zone_result.zone}' compound risk score "
                f"{zone_result.risk_score:.2f} reached the "
                f"{self._threshold:.2f} threshold for '{self._action.value}'."
            ),
        )
