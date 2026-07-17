"""Risk Agent — compound zone risk assessment.

Thin adapter around :class:`~src.services.compound_risk.compound_risk_service.CompoundRiskService`.
Depends on a narrow :class:`RiskEnginePort` rather than the concrete
service class, so this agent is constructible in tests with a fake and
wireable in production with the real service — the same seam every
other service in this codebase already uses (see
``src.services.compound_risk.compound_risk_service.SensorMonitoringPort``
for the pattern this mirrors).
"""

from __future__ import annotations

from typing import Protocol

from src.ai.agents.base import AgentRequest, AgentResult


class RiskEnginePort(Protocol):
    """Contract required from the compound risk service."""

    def detect_compound_risks(self) -> list[object]: ...


class RiskAgent:
    """Reports compound risk conditions across monitored zones."""

    def __init__(self, engine: RiskEnginePort) -> None:
        self._engine = engine

    @property
    def name(self) -> str:
        return "risk"

    def run(self, request: AgentRequest) -> AgentResult:
        del request  # zone-scoped filtering not yet implemented; evaluates all zones
        try:
            results = self._engine.detect_compound_risks()
        except Exception as exc:  # noqa: BLE001 - one agent's failure must not abort the others
            return AgentResult(agent=self.name, summary="", error=str(exc))

        if not results:
            return AgentResult(agent=self.name, summary="No compound risk conditions detected.", data=[])

        summary = "; ".join(
            f"{result.zone}: {result.risk_level.value} ({result.risk_score:.0f})" for result in results
        )
        return AgentResult(
            agent=self.name,
            summary=f"Compound risk detected in {len(results)} zone(s): {summary}",
            data=results,
        )
