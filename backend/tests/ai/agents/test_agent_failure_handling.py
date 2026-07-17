"""Tests that every specialized agent degrades gracefully and logs on internal failure.

Covers the "Agent failure" failure mode: each agent's own ``run()``
catches exceptions from its engine port and returns a failed
``AgentResult`` rather than raising, and now also logs a warning so the
failure isn't silent (see each agent module's ``run()``).
"""

from __future__ import annotations

import logging

import pytest

from src.ai.agents.base import AgentRequest
from src.ai.agents.compliance_agent import ComplianceAgent
from src.ai.agents.emergency_agent import EmergencyAgent
from src.ai.agents.graph_knowledge_agent import GraphKnowledgeAgent
from src.ai.agents.knowledge_agent import KnowledgeAgent
from src.ai.agents.risk_agent import RiskAgent


class _RaisingMonitoringEngine:
    def get_sensor_summary(self) -> dict:
        raise RuntimeError("sensor service down")

    def get_worker_summary(self) -> dict:
        raise RuntimeError("worker service down")


class _RaisingCompoundRiskEngine:
    def detect_compound_risks(self) -> list:
        raise RuntimeError("compound risk engine down")


class _RaisingRetrievalEngine:
    def query(self, *, question: str, limit: int = 5, min_similarity: float | None = None) -> list:
        raise RuntimeError("retrieval engine down")


class _RaisingGraphEngine:
    def __getattr__(self, name: str):
        def _raise(*args: object, **kwargs: object) -> None:
            raise RuntimeError("graph engine down")

        return _raise


class _RaisingEmergencyEngine:
    def respond(self, zone_results: list) -> list:
        raise RuntimeError("emergency engine down")


class TestAgentFailureDegradesGracefully:
    def test_risk_agent_returns_failed_result_instead_of_raising(self) -> None:
        agent = RiskAgent(_RaisingMonitoringEngine(), _RaisingCompoundRiskEngine())

        result = agent.run(AgentRequest(text="risk check"))

        assert result.ok is False
        assert result.agent == "risk"
        assert "sensor service down" in result.error

    def test_compliance_agent_returns_failed_result_instead_of_raising(self) -> None:
        agent = ComplianceAgent(_RaisingRetrievalEngine())

        result = agent.run(AgentRequest(text="what regulation applies?"))

        assert result.ok is False
        assert result.agent == "compliance"

    def test_knowledge_agent_returns_failed_result_instead_of_raising(self) -> None:
        agent = KnowledgeAgent(_RaisingRetrievalEngine())

        result = agent.run(AgentRequest(text="explain this policy"))

        assert result.ok is False
        assert result.agent == "knowledge"

    def test_graph_knowledge_agent_returns_failed_result_instead_of_raising(self) -> None:
        agent = GraphKnowledgeAgent(_RaisingGraphEngine())

        result = agent.run(AgentRequest(text="who works in Zone-A?"))

        assert result.ok is False
        assert result.agent == "graph_knowledge"

    def test_emergency_agent_returns_failed_result_instead_of_raising(self) -> None:
        agent = EmergencyAgent(_RaisingEmergencyEngine())

        result = agent.run(AgentRequest(text="respond", params={"risk_results": [object()]}))

        assert result.ok is False
        assert result.agent == "emergency"


class TestAgentFailureIsLogged:
    """Failures must not be silent — each agent logs a warning before returning."""

    def test_risk_agent_logs_on_failure(self, caplog: pytest.LogCaptureFixture) -> None:
        agent = RiskAgent(_RaisingMonitoringEngine(), _RaisingCompoundRiskEngine())

        with caplog.at_level(logging.WARNING, logger="src.ai.agents.risk_agent"):
            agent.run(AgentRequest(text="risk check"))

        assert any("Risk agent failed" in record.message for record in caplog.records)

    def test_compliance_agent_logs_on_failure(self, caplog: pytest.LogCaptureFixture) -> None:
        agent = ComplianceAgent(_RaisingRetrievalEngine())

        with caplog.at_level(logging.WARNING, logger="src.ai.agents.compliance_agent"):
            agent.run(AgentRequest(text="what regulation applies?"))

        assert any("Compliance agent failed" in record.message for record in caplog.records)

    def test_knowledge_agent_logs_on_failure(self, caplog: pytest.LogCaptureFixture) -> None:
        agent = KnowledgeAgent(_RaisingRetrievalEngine())

        with caplog.at_level(logging.WARNING, logger="src.ai.agents.knowledge_agent"):
            agent.run(AgentRequest(text="explain this policy"))

        assert any("Knowledge agent failed" in record.message for record in caplog.records)

    def test_graph_knowledge_agent_logs_on_failure(self, caplog: pytest.LogCaptureFixture) -> None:
        agent = GraphKnowledgeAgent(_RaisingGraphEngine())

        with caplog.at_level(logging.WARNING, logger="src.ai.agents.graph_knowledge_agent"):
            agent.run(AgentRequest(text="who works in Zone-A?"))

        assert any("Graph Knowledge agent failed" in record.message for record in caplog.records)

    def test_emergency_agent_logs_on_failure(self, caplog: pytest.LogCaptureFixture) -> None:
        agent = EmergencyAgent(_RaisingEmergencyEngine())

        with caplog.at_level(logging.WARNING, logger="src.ai.agents.emergency_agent"):
            agent.run(AgentRequest(text="respond", params={"risk_results": [object()]}))

        assert any("Emergency agent failed" in record.message for record in caplog.records)
