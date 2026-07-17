"""Tests for the AI Monitoring Service (src.ai.monitoring.service)."""

from __future__ import annotations

from src.ai.agents.registry import AgentRegistry
from src.ai.monitoring.service import (
    build_ai_health,
    build_ai_status,
    build_performance_metrics,
    build_workflow_status,
    lightweight_agent_registry,
)
from src.utils.metrics import MetricsRegistry

_UNREACHABLE_BASE_URL = "http://localhost:1"


class TestLightweightAgentRegistry:
    def test_registers_all_five_built_in_agents_with_no_io(self) -> None:
        registry = lightweight_agent_registry()

        assert set(registry.names()) == {"risk", "compliance", "knowledge", "graph_knowledge", "emergency"}

    def test_returns_a_real_agent_registry_instance(self) -> None:
        registry = lightweight_agent_registry()

        assert isinstance(registry, AgentRegistry)


class TestBuildAiStatus:
    def test_reports_every_registered_agent(self) -> None:
        registry = lightweight_agent_registry()

        status = build_ai_status(
            registry=registry,
            llm_model="llama3.1:8b",
            embedding_model="nomic-embed-text",
            graph_database="neo4j",
            conversation_memory_max_turns=10,
        )

        assert {a.name for a in status.agents} == set(registry.names())

    def test_attaches_trigger_keywords_for_known_agents(self) -> None:
        registry = lightweight_agent_registry()

        status = build_ai_status(
            registry=registry, llm_model="m", embedding_model="e", graph_database="neo4j", conversation_memory_max_turns=10
        )

        risk_info = next(a for a in status.agents if a.name == "risk")
        assert "risk" in risk_info.trigger_keywords

    def test_reports_configured_models_and_settings_verbatim(self) -> None:
        registry = AgentRegistry()

        status = build_ai_status(
            registry=registry,
            llm_model="custom-model",
            embedding_model="custom-embed",
            graph_database="custom-db",
            conversation_memory_max_turns=42,
        )

        assert status.llm_model == "custom-model"
        assert status.embedding_model == "custom-embed"
        assert status.graph_database == "custom-db"
        assert status.conversation_memory_max_turns == 42

    def test_empty_registry_reports_no_agents(self) -> None:
        status = build_ai_status(
            registry=AgentRegistry(), llm_model="m", embedding_model="e", graph_database="neo4j", conversation_memory_max_turns=10
        )

        assert status.agents == ()


class TestBuildAiHealth:
    def test_unreachable_dependencies_report_false(self) -> None:
        health = build_ai_health(ollama_base_url=_UNREACHABLE_BASE_URL, ollama_timeout_seconds=2.0)

        assert health.healthy is False
        by_name = {d.name: d for d in health.dependencies}
        assert by_name["ollama"].reachable is False
        assert by_name["neo4j"].reachable is False  # no live Neo4j in the test environment

    def test_reports_exactly_two_dependencies(self) -> None:
        health = build_ai_health(ollama_base_url=_UNREACHABLE_BASE_URL, ollama_timeout_seconds=2.0)

        assert {d.name for d in health.dependencies} == {"neo4j", "ollama"}

    def test_unreachable_ollama_detail_mentions_the_base_url(self) -> None:
        health = build_ai_health(ollama_base_url=_UNREACHABLE_BASE_URL, ollama_timeout_seconds=2.0)

        ollama = next(d for d in health.dependencies if d.name == "ollama")
        assert _UNREACHABLE_BASE_URL in ollama.detail

    def test_healthy_property_is_false_if_any_dependency_is_unreachable(self) -> None:
        health = build_ai_health(ollama_base_url=_UNREACHABLE_BASE_URL, ollama_timeout_seconds=2.0)

        assert health.healthy == all(d.reachable for d in health.dependencies)


class TestBuildPerformanceMetrics:
    def test_empty_registry_reports_no_operations(self) -> None:
        metrics = build_performance_metrics(metrics=MetricsRegistry())

        assert metrics.operations == ()

    def test_reports_real_recorded_operations(self) -> None:
        registry = MetricsRegistry()
        registry.record("agent_execution", 10.0)
        registry.record("agent_execution", 20.0)
        registry.record("llm_generate", 5.0)

        metrics = build_performance_metrics(metrics=registry)

        by_operation = {op.operation: op for op in metrics.operations}
        assert by_operation["agent_execution"].count == 2
        assert by_operation["agent_execution"].avg_ms == 15.0
        assert by_operation["llm_generate"].count == 1

    def test_defaults_to_the_shared_process_wide_registry(self) -> None:
        from src.utils.metrics import default_metrics_registry

        default_metrics_registry().reset()
        default_metrics_registry().record("workflow", 7.0)

        metrics = build_performance_metrics()

        assert any(op.operation == "workflow" for op in metrics.operations)


class TestBuildWorkflowStatus:
    def test_reports_registered_agents(self) -> None:
        registry = lightweight_agent_registry()

        workflow = build_workflow_status(registry=registry, routing_fallback=("knowledge",))

        assert set(workflow.agents) == set(registry.names())

    def test_reports_routing_fallback_filtered_to_registered_agents(self) -> None:
        registry = lightweight_agent_registry()

        workflow = build_workflow_status(registry=registry, routing_fallback=("knowledge", "nonexistent_agent"))

        assert workflow.routing_fallback == ("knowledge",)

    def test_reports_the_known_risk_to_emergency_handoff(self) -> None:
        registry = lightweight_agent_registry()

        workflow = build_workflow_status(registry=registry, routing_fallback=("knowledge",))

        assert any(h.producer == "risk" and h.consumer_param == "risk_results" for h in workflow.handoffs)

    def test_empty_registry_reports_no_agents_and_no_fallback(self) -> None:
        workflow = build_workflow_status(registry=AgentRegistry(), routing_fallback=("knowledge",))

        assert workflow.agents == ()
        assert workflow.routing_fallback == ()
