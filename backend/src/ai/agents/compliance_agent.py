"""Compliance Agent — Factory Act / OISD / DGMS evaluation of detected incidents.

Thin adapter around :class:`~src.services.compliance.compliance_service.ComplianceService`.
"""

from __future__ import annotations

from typing import Protocol

from src.ai.agents.base import AgentRequest, AgentResult


class ComplianceEnginePort(Protocol):
    """Contract required from the compliance service."""

    def evaluate_all_incidents(self, skip: int = 0, limit: int = 100) -> list[object]: ...


class ComplianceAgent:
    """Reports compliance violations across evaluated incidents."""

    def __init__(self, engine: ComplianceEnginePort) -> None:
        self._engine = engine

    @property
    def name(self) -> str:
        return "compliance"

    def run(self, request: AgentRequest) -> AgentResult:
        limit = int(request.params.get("limit", 100))
        try:
            results = self._engine.evaluate_all_incidents(limit=limit)
        except Exception as exc:  # noqa: BLE001 - one agent's failure must not abort the others
            return AgentResult(agent=self.name, summary="", error=str(exc))

        violations = [result for result in results if result.violations]
        if not violations:
            return AgentResult(
                agent=self.name,
                summary=f"No compliance violations found across {len(results)} evaluated incident(s).",
                data=results,
            )

        citations = tuple(
            violation.rule_code for result in violations for violation in result.violations
        )
        return AgentResult(
            agent=self.name,
            summary=(
                f"{len(violations)} of {len(results)} incident(s) have compliance "
                f"violations ({len(citations)} rule(s) triggered)."
            ),
            data=violations,
            citations=citations,
        )
