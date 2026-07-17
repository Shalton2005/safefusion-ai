"""Emergency Agent — structured emergency response for zones under compound risk.

Thin adapter around
:class:`~src.services.emergency_response.emergency_response_service.EmergencyResponseService`
(the Emergency Response Engine), reached through the narrow
:class:`EmergencyEnginePort` rather than the concrete class — the same
seam every agent in this package uses.

Modularity: this module contains no categorization logic of its own. It
only (1) resolves the Risk agent's output into engine input, (2) calls
the engine, and (3) hands the raw result to
:func:`~src.ai.agents.emergency_categorization.categorize`, which lives
in its own module and turns the engine's flat action list into the four
requested categories. Splitting these means the categorization rules
(which action is "immediate" vs. a "notification", how escalation tiers
map to risk levels) can change, be tested, or be reused independently of
this agent's request/response plumbing.

Unlike the other built-in agents, this one needs another agent's output
as input: the Emergency Response Engine evaluates ``ZoneCompoundRiskResult``
records produced by the Risk agent. Rather than re-running risk
detection itself (duplicate work, and a second source of truth for the
same zone scores), it reads ``request.params["risk_results"]`` —
populated by the supervisor when the Risk agent ran earlier in the same
sequence (see ``src/ai/agents/supervisor.py``). If nothing was supplied
(e.g. this agent is invoked standalone, or the router didn't sequence
Risk first), it degrades to reporting that no risk context was
available rather than guessing or failing outright.
"""

from __future__ import annotations

from typing import Protocol

from src.ai.agents.base import AgentRequest, AgentResult
from src.ai.agents.emergency_categorization import EmergencyAssessment, categorize


class EmergencyEnginePort(Protocol):
    """Contract required from the emergency response service."""

    def respond(self, zone_results: list[object]) -> list[object]: ...


class EmergencyAgent:
    """Reports immediate actions, notifications, escalation, and incident workflow for zones under compound risk."""

    def __init__(self, engine: EmergencyEnginePort) -> None:
        self._engine = engine

    @property
    def name(self) -> str:
        return "emergency"

    def run(self, request: AgentRequest) -> AgentResult:
        risk_results = request.params.get("risk_results")
        if not risk_results:
            return AgentResult(
                agent=self.name,
                summary="No compound risk context available; emergency response requires the Risk agent to run first.",
                data=EmergencyAssessment(
                    immediate_actions=[], notifications=[], escalation=[], incident_workflow=[]
                ),
            )

        try:
            zone_results = self._engine.respond(risk_results)
        except Exception as exc:  # noqa: BLE001 - one agent's failure must not abort the others
            return AgentResult(agent=self.name, summary="", error=str(exc))

        assessment = categorize(zone_results)

        if not zone_results:
            return AgentResult(agent=self.name, summary="No emergency actions required.", data=assessment)

        return AgentResult(
            agent=self.name,
            summary=(
                f"Emergency response for {len(zone_results)} zone(s): "
                f"{len(assessment.immediate_actions)} immediate action(s), "
                f"{len(assessment.notifications)} notification(s), "
                f"{len(assessment.escalation)} escalation(s), "
                f"{len(assessment.incident_workflow)} incident workflow step(s)."
            ),
            data=assessment,
        )
