"""Emergency Response Engine: maps compound risk results to emergency actions."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.services.compound_risk.schemas import ZoneCompoundRiskResult
from src.services.emergency_response.rules import EmergencyResponseRule
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult


@dataclass
class EmergencyResponseEngine:
    """Evaluates configured emergency response rules against compound risk results.

    A zone can trigger any number of predefined actions at once — rules
    are independent, not mutually exclusive bands, so e.g. a zone can
    simultaneously require ``notify_safety_officer``, ``stop_work``, and
    ``evacuate_area``.
    """

    rules: list[EmergencyResponseRule] = field(default_factory=list)

    def evaluate(
        self, zone_results: list[ZoneCompoundRiskResult]
    ) -> list[ZoneEmergencyResponseResult]:
        """Run every configured rule against each zone's compound risk result.

        Args:
            zone_results: Output of the Compound Risk Engine — one entry
                per zone where at least one compound risk condition fired.

        Returns:
            One ``ZoneEmergencyResponseResult`` per zone that has at least
            one dispatched action, sorted by risk score descending.
        """
        results: list[ZoneEmergencyResponseResult] = []
        for zone_result in zone_results:
            actions = []
            for rule in self.rules:
                match = rule.evaluate(zone_result)
                if match is not None:
                    actions.append(match)
            if not actions:
                continue
            results.append(
                ZoneEmergencyResponseResult(
                    zone=zone_result.zone,
                    risk_score=zone_result.risk_score,
                    risk_level=zone_result.risk_level,
                    actions=actions,
                )
            )

        results.sort(key=lambda result: result.risk_score, reverse=True)
        return results
