"""Emergency Agent — dispatches emergency actions for zones under compound risk.

Thin adapter around
:class:`~src.services.emergency_response.emergency_response_service.EmergencyResponseService`.

Unlike the other three agents, this one needs another agent's output as
input: the emergency response engine evaluates
``ZoneCompoundRiskResult`` records produced by the Risk agent. Rather
than re-running risk detection itself (duplicate work, and a second
source of truth for the same zone scores), it reads
``request.params["risk_results"]`` — populated by the supervisor when
the Risk agent ran earlier in the same sequence (see
``src/ai/agents/supervisor.py``). If nothing was supplied (e.g. this
agent is invoked standalone, or the router didn't sequence Risk first),
it degrades to reporting that no risk context was available rather than
guessing or failing outright.
"""

from __future__ import annotations

from typing import Protocol

from src.ai.agents.base import AgentRequest, AgentResult


class EmergencyEnginePort(Protocol):
    """Contract required from the emergency response service."""

    def respond(self, zone_results: list[object]) -> list[object]: ...


class EmergencyAgent:
    """Dispatches emergency actions for zones flagged by compound risk."""

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
                data=[],
            )

        try:
            results = self._engine.respond(risk_results)
        except Exception as exc:  # noqa: BLE001 - one agent's failure must not abort the others
            return AgentResult(agent=self.name, summary="", error=str(exc))

        if not results:
            return AgentResult(agent=self.name, summary="No emergency actions required.", data=[])

        summary = "; ".join(
            f"{result.zone}: {', '.join(action.action.value for action in result.actions)}"
            for result in results
        )
        return AgentResult(
            agent=self.name,
            summary=f"Emergency actions dispatched for {len(results)} zone(s): {summary}",
            data=results,
        )
