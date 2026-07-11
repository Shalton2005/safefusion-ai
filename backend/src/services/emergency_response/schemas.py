"""Dataclasses shared by the emergency response rule engine and service."""

from __future__ import annotations

from dataclasses import dataclass

from src.models.enums import EmergencyActionType, RiskLevel


@dataclass(frozen=True)
class EmergencyActionMatch:
    """A single emergency action dispatched for one zone."""

    action: EmergencyActionType
    triggered_by_rule: str
    explanation: str


@dataclass(frozen=True)
class ZoneEmergencyResponseResult:
    """Computed emergency response outcome for a single zone."""

    zone: str
    risk_score: float
    risk_level: RiskLevel
    actions: list[EmergencyActionMatch]

    @property
    def action_types(self) -> list[EmergencyActionType]:
        """Convenience accessor for just the dispatched action types."""
        return [match.action for match in self.actions]

    @property
    def explanation(self) -> str:
        """Human-readable summary of every dispatched action for this zone."""
        if not self.actions:
            return "No emergency response actions required."
        return " ".join(match.explanation for match in self.actions)
