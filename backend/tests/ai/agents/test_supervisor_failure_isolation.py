"""Tests that the Supervisor continues processing when one agent fails.

Covers the "continue processing whenever possible" / "return partial
results" requirements at the orchestration level — one agent's failure
must not prevent the others from running or abort the whole request.
"""

from __future__ import annotations

from src.ai.agents.base import AgentRequest, AgentResult
from src.ai.agents.registry import AgentRegistry
from src.ai.agents.supervisor import Supervisor


class _FailingAgent:
    def __init__(self, name: str) -> None:
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    def run(self, request: AgentRequest) -> AgentResult:
        raise RuntimeError(f"{self._name} exploded")


class _SucceedingAgent:
    def __init__(self, name: str) -> None:
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    def run(self, request: AgentRequest) -> AgentResult:
        return AgentResult(agent=self._name, summary=f"{self._name} ok")


class _AllMatchingRouting:
    """Routes to every registered agent, in registration order — deterministic for tests."""

    def route(self, text: str, registry: AgentRegistry) -> list[str]:
        return list(registry.names())


class TestSupervisorFailureIsolation:
    def test_one_agent_raising_does_not_abort_the_others(self) -> None:
        registry = AgentRegistry()
        registry.register(_SucceedingAgent("risk"))
        registry.register(_FailingAgent("compliance"))
        registry.register(_SucceedingAgent("knowledge"))
        supervisor = Supervisor(registry, _AllMatchingRouting())

        response = supervisor.handle(AgentRequest(text="anything"))

        assert len(response.results) == 3
        assert response.result_for("risk").ok is True
        assert response.result_for("compliance").ok is False
        assert response.result_for("knowledge").ok is True

    def test_failed_agent_result_carries_the_error_message(self) -> None:
        registry = AgentRegistry()
        registry.register(_FailingAgent("compliance"))
        supervisor = Supervisor(registry, _AllMatchingRouting())

        response = supervisor.handle(AgentRequest(text="anything"))

        assert "compliance exploded" in response.result_for("compliance").error

    def test_all_agents_failing_still_returns_a_response_not_a_raise(self) -> None:
        registry = AgentRegistry()
        registry.register(_FailingAgent("risk"))
        registry.register(_FailingAgent("compliance"))
        supervisor = Supervisor(registry, _AllMatchingRouting())

        response = supervisor.handle(AgentRequest(text="anything"))

        assert response.ok is False
        assert len(response.results) == 2

    def test_partial_success_is_reflected_in_overall_ok_flag(self) -> None:
        registry = AgentRegistry()
        registry.register(_SucceedingAgent("risk"))
        registry.register(_FailingAgent("compliance"))
        supervisor = Supervisor(registry, _AllMatchingRouting())

        response = supervisor.handle(AgentRequest(text="anything"))

        assert response.ok is False  # not every agent succeeded
        assert response.result_for("risk").ok is True  # but risk's result is still usable

    def test_malformed_risk_handoff_data_does_not_crash_the_supervisor(self) -> None:
        """A succeeding agent registered as "risk" whose data isn't list[RiskAssessment]-shaped.

        Regression test: Supervisor._HANDOFFS unconditionally calls the
        risk->emergency extractor on any successful "risk"-named agent's
        data. _SucceedingAgent here reports ok=True with data=None (the
        AgentResult default), which used to raise inside the extractor
        and crash handle() entirely — defeating "one agent's failure
        never aborts the others" for a bug that isn't even in the agent
        itself. Emergency still runs today (it degrades to "no risk
        context" on a missing risk_results param), so this also proves
        the consumer isn't silently skipped.
        """
        registry = AgentRegistry()
        registry.register(_SucceedingAgent("risk"))  # data=None — malformed for the handoff extractor
        registry.register(_SucceedingAgent("emergency"))
        supervisor = Supervisor(registry, _AllMatchingRouting())

        response = supervisor.handle(AgentRequest(text="anything"))  # must not raise

        assert response.result_for("risk").ok is True
        assert response.result_for("emergency").ok is True
