"""Tests that the Supervisor emits timing telemetry for agent execution and overall workflow duration."""

from __future__ import annotations

import logging

from src.ai.agents.base import AgentRequest, AgentResult
from src.ai.agents.registry import AgentRegistry
from src.ai.agents.supervisor import Supervisor


class _SucceedingAgent:
    def __init__(self, name: str) -> None:
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    def run(self, request: AgentRequest) -> AgentResult:
        return AgentResult(agent=self._name, summary=f"{self._name} ok", data=[])


class _AllMatchingRouting:
    def route(self, text: str, registry: AgentRegistry) -> list[str]:
        return list(registry.names())


class TestSupervisorTiming:
    def test_logs_one_agent_execution_timing_line_per_executed_agent(self, caplog) -> None:
        registry = AgentRegistry()
        registry.register(_SucceedingAgent("risk"))
        registry.register(_SucceedingAgent("compliance"))
        supervisor = Supervisor(registry, _AllMatchingRouting())

        with caplog.at_level(logging.INFO, logger="src.ai.agents.supervisor"):
            supervisor.handle(AgentRequest(text="anything"))

        agent_execution_lines = [r.message for r in caplog.records if "operation=agent_execution" in r.message]
        assert len(agent_execution_lines) == 2
        assert any("agent=risk" in line for line in agent_execution_lines)
        assert any("agent=compliance" in line for line in agent_execution_lines)

    def test_agent_execution_timing_lines_carry_a_duration(self, caplog) -> None:
        registry = AgentRegistry()
        registry.register(_SucceedingAgent("risk"))
        supervisor = Supervisor(registry, _AllMatchingRouting())

        with caplog.at_level(logging.INFO, logger="src.ai.agents.supervisor"):
            supervisor.handle(AgentRequest(text="anything"))

        line = next(r.message for r in caplog.records if "operation=agent_execution" in r.message)
        assert "duration_ms=" in line

    def test_logs_exactly_one_workflow_timing_line_per_handle_call(self, caplog) -> None:
        registry = AgentRegistry()
        registry.register(_SucceedingAgent("risk"))
        registry.register(_SucceedingAgent("compliance"))
        supervisor = Supervisor(registry, _AllMatchingRouting())

        with caplog.at_level(logging.INFO, logger="src.ai.agents.supervisor"):
            supervisor.handle(AgentRequest(text="anything"))

        workflow_lines = [r.message for r in caplog.records if "operation=workflow" in r.message]
        assert len(workflow_lines) == 1

    def test_no_agents_routed_still_logs_workflow_timing(self, caplog) -> None:
        registry = AgentRegistry()
        supervisor = Supervisor(registry, _AllMatchingRouting())

        with caplog.at_level(logging.INFO, logger="src.ai.agents.supervisor"):
            supervisor.handle(AgentRequest(text="anything"))

        assert any("operation=workflow" in r.message for r in caplog.records)
        assert not any("operation=agent_execution" in r.message for r in caplog.records)
