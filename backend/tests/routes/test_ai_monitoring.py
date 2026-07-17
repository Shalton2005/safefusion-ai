"""Tests for the AI monitoring API routes.

Exercises the actual FastAPI app (Route -> Service, structured JSON
response), overriding ``get_monitoring_registry`` with a fake registry
where a test needs deterministic agent names. No live database, Neo4j,
or Ollama instance is required — the Neo4j/Ollama checks in
``/ai/health`` naturally report ``reachable=False`` against this test
environment's absent dependencies, which is itself the behavior under
test.

Requires ``langgraph`` (imported transitively via ``server.py``) — run
this file with the backend's own virtualenv, not a bare venv missing
that dependency.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from server import app
from src.ai.agents.registry import AgentRegistry
from src.routes.ai_monitoring import get_monitoring_registry
from src.utils.metrics import MetricsRegistry, default_metrics_registry


class _FakeAgent:
    def __init__(self, name: str) -> None:
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    def run(self, request: object) -> None:
        raise NotImplementedError


def _client_with_registry(registry: AgentRegistry) -> TestClient:
    app.dependency_overrides[get_monitoring_registry] = lambda: registry
    return TestClient(app)


def _reset_overrides() -> None:
    app.dependency_overrides.pop(get_monitoring_registry, None)


class TestAiStatusRoute:
    def test_returns_structured_json_with_registered_agents(self) -> None:
        registry = AgentRegistry()
        registry.register(_FakeAgent("risk"))
        registry.register(_FakeAgent("compliance"))
        client = _client_with_registry(registry)

        try:
            response = client.get("/api/v1/ai/status")
        finally:
            _reset_overrides()

        assert response.status_code == 200
        body = response.json()
        assert {a["name"] for a in body["agents"]} == {"risk", "compliance"}
        assert "llm_model" in body
        assert "embedding_model" in body
        assert "conversation_memory_max_turns" in body

    def test_agent_trigger_keywords_are_included(self) -> None:
        registry = AgentRegistry()
        registry.register(_FakeAgent("risk"))
        client = _client_with_registry(registry)

        try:
            response = client.get("/api/v1/ai/status")
        finally:
            _reset_overrides()

        [risk_info] = response.json()["agents"]
        assert "risk" in risk_info["trigger_keywords"]

    def test_default_registry_reports_all_five_built_in_agents(self) -> None:
        client = TestClient(app)

        response = client.get("/api/v1/ai/status")

        body = response.json()
        assert {a["name"] for a in body["agents"]} == {
            "risk", "compliance", "knowledge", "graph_knowledge", "emergency",
        }


class TestAiHealthRoute:
    def test_returns_structured_json_with_both_dependencies(self) -> None:
        client = TestClient(app)

        response = client.get("/api/v1/ai/health")

        assert response.status_code == 200
        body = response.json()
        assert {d["name"] for d in body["dependencies"]} == {"neo4j", "ollama"}
        assert "healthy" in body

    def test_unreachable_dependencies_report_healthy_false(self) -> None:
        # No live Neo4j/Ollama in the test environment — this is the
        # actual, correct behavior being asserted, not a workaround.
        client = TestClient(app)

        response = client.get("/api/v1/ai/health")

        body = response.json()
        assert body["healthy"] is False
        assert all(d["reachable"] is False for d in body["dependencies"])


class TestAiMetricsRoute:
    def test_returns_structured_json_with_operations_list(self) -> None:
        default_metrics_registry().reset()
        client = TestClient(app)

        response = client.get("/api/v1/ai/metrics")

        assert response.status_code == 200
        assert response.json() == {"operations": []}

    def test_reflects_real_recorded_operations(self) -> None:
        default_metrics_registry().reset()
        default_metrics_registry().record("agent_execution", 15.0)
        client = TestClient(app)

        response = client.get("/api/v1/ai/metrics")

        body = response.json()
        [op] = body["operations"]
        assert op["operation"] == "agent_execution"
        assert op["count"] == 1
        assert op["avg_ms"] == 15.0


class TestAiWorkflowRoute:
    def test_returns_structured_json_with_agents_and_handoffs(self) -> None:
        registry = AgentRegistry()
        registry.register(_FakeAgent("risk"))
        registry.register(_FakeAgent("emergency"))
        client = _client_with_registry(registry)

        try:
            response = client.get("/api/v1/ai/workflow")
        finally:
            _reset_overrides()

        assert response.status_code == 200
        body = response.json()
        assert set(body["agents"]) == {"risk", "emergency"}
        assert any(h["producer"] == "risk" for h in body["handoffs"])

    def test_default_registry_reports_routing_fallback(self) -> None:
        client = TestClient(app)

        response = client.get("/api/v1/ai/workflow")

        assert response.json()["routing_fallback"] == ["knowledge"]
