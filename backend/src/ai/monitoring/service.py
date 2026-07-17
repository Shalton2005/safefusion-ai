"""AI Monitoring Service — assembles the data behind the four ``/ai/*`` monitoring endpoints.

Each endpoint reports genuinely observed or configured data, not
placeholders:

    - **AI Status** (:func:`build_ai_status`) — static configuration:
      which agents are registered, what routes to them, which
      LLM/embedding models are configured. No I/O.
    - **AI Health** (:func:`build_ai_health`) — live reachability of
      Neo4j (:func:`~src.graph_database.driver.verify_connectivity`)
      and Ollama (:func:`~src.ai.llm.ollama_provider.check_ollama_reachable`).
      The first real caller of either check in this codebase.
    - **Performance Metrics** (:func:`build_performance_metrics`) — real
      count/min/avg/max/last per operation, read from
      :func:`~src.utils.metrics.default_metrics_registry`, which every
      :func:`~src.utils.timing.timed` call across the AI layer already
      feeds (agent execution, retrieval, graph queries, LLM calls,
      overall workflow duration).
    - **Workflow Status** (:func:`build_workflow_status`) — the
      Supervisor workflow's static shape (registered agents, routing
      fallback, known handoffs). Not live/historical execution state:
      no request execution history is persisted anywhere in this
      codebase today (see ``src/ai/memory/``, which stores conversation
      turns, not workflow run records) — reporting fabricated "last N
      requests" data would misrepresent what the system actually knows.

:func:`lightweight_agent_registry` builds the same agent set
:func:`~src.ai.agents.factory.build_default_registry` would, but with
placeholder engines that are never called — see its own docstring — so
``build_ai_status``/``build_workflow_status`` don't require a live
DB/Neo4j session just to report which agents exist.

No FastAPI import anywhere in this module — plain functions over the
dataclasses in ``schemas.py``, translated to Pydantic response models at
the route layer (``src/routes/ai_monitoring.py``), the same split every
other ``src.ai`` package uses.
"""

from __future__ import annotations

from typing import Any

from src.ai.agents.factory import build_default_registry
from src.ai.agents.registry import AgentRegistry
from src.ai.agents.routing import default_keyword_routes
from src.ai.agents.supervisor import known_handoffs
from src.ai.llm.ollama_provider import check_ollama_reachable
from src.ai.monitoring.schemas import (
    AgentInfo,
    AiHealth,
    AiStatus,
    DependencyHealth,
    HandoffInfo,
    OperationMetrics,
    PerformanceMetrics,
    WorkflowStatus,
)
from src.utils.metrics import MetricsRegistry, default_metrics_registry


class _InertEnginePort:
    """Placeholder satisfying every ``*EnginePort`` Protocol in ``src.ai.agents`` without doing any I/O.

    Agent ``__init__`` methods only *store* the engine reference they're
    given (see e.g. ``RiskAgent.__init__``) — none of them call it at
    construction time, only from inside ``run()``. Since every
    ``*EnginePort`` is a structural :class:`typing.Protocol`, not a
    runtime-checked ABC, one placeholder with no real methods satisfies
    all five without a type error at the call sites below (a static type
    checker would flag it; nothing at runtime does, and nothing here
    ever calls a method on it).

    Exists so :func:`lightweight_agent_registry` can report *which*
    agents ``build_default_registry`` would register — reusing that
    factory's own registration logic instead of duplicating the agent
    name list a third time — without requiring a live DB session or
    Neo4j session just to answer a monitoring query.
    """


def lightweight_agent_registry() -> AgentRegistry:
    """Build the same agent registry :func:`~src.ai.agents.factory.build_default_registry` would, with zero I/O.

    For monitoring endpoints that only need to know *which* agents are
    registered (``/ai/status``, ``/ai/workflow``) — never execute one —
    requiring a live database/Neo4j connection just to answer "what
    agents exist" would defeat the point of a lightweight status check.
    """
    placeholder: Any = _InertEnginePort()
    return build_default_registry(
        monitoring_engine=placeholder,
        compound_risk_engine=placeholder,
        retrieval_engine=placeholder,
        knowledge_engine=placeholder,
        graph_engine=placeholder,
        emergency_engine=placeholder,
    )


def build_ai_status(
    *,
    registry: AgentRegistry,
    llm_model: str,
    embedding_model: str,
    graph_database: str,
    conversation_memory_max_turns: int,
) -> AiStatus:
    """Assemble :class:`~src.ai.monitoring.schemas.AiStatus` from registry contents and configured models.

    Args:
        registry: The agent registry a real request would route through
            (typically :func:`~src.ai.agents.factory.build_default_registry`'s
            output) — this function only reads it, never executes
            anything.
        llm_model: Configured Ollama chat model name.
        embedding_model: Configured Ollama embedding model name.
        graph_database: Configured Neo4j database name.
        conversation_memory_max_turns: Configured conversation memory
            window size.
    """
    keywords_by_agent = default_keyword_routes()
    agents = tuple(
        AgentInfo(name=name, trigger_keywords=keywords_by_agent.get(name, ()))
        for name in registry.names()
    )
    return AiStatus(
        agents=agents,
        llm_model=llm_model,
        embedding_model=embedding_model,
        graph_database=graph_database,
        conversation_memory_max_turns=conversation_memory_max_turns,
    )


def build_ai_health(*, ollama_base_url: str, ollama_timeout_seconds: float = 5.0) -> AiHealth:
    """Probe every external dependency the AI layer needs and report reachability.

    Both checks are synchronous and bounded (Neo4j by the driver's own
    connection timeout, Ollama by ``ollama_timeout_seconds``) — a caller
    (the ``/ai/health`` route) pays that latency once per request, which
    is the expected cost of an honest readiness probe rather than a
    cached/static "configured" claim.
    """
    # Imported lazily so this module doesn't force a Neo4j driver import
    # (and thus a driver connection attempt at import time — see
    # src/graph_database/driver.py's module docstring) onto every
    # caller of build_ai_status()/build_performance_metrics(), which
    # don't need it.
    from src.graph_database.driver import verify_connectivity

    neo4j_reachable = verify_connectivity()
    ollama_reachable = check_ollama_reachable(ollama_base_url, timeout_seconds=ollama_timeout_seconds)

    dependencies = (
        DependencyHealth(
            name="neo4j",
            reachable=neo4j_reachable,
            detail="Connected" if neo4j_reachable else "Unreachable — check NEO4J_URI and that Neo4j is running.",
        ),
        DependencyHealth(
            name="ollama",
            reachable=ollama_reachable,
            detail="Connected" if ollama_reachable else f"Unreachable at {ollama_base_url} — check OLLAMA_BASE_URL and that Ollama is running.",
        ),
    )
    return AiHealth(dependencies=dependencies)


def build_performance_metrics(*, metrics: MetricsRegistry | None = None) -> PerformanceMetrics:
    """Read current duration statistics for every operation recorded so far.

    Args:
        metrics: Registry to read from. Defaults to
            :func:`~src.utils.metrics.default_metrics_registry` — the
            same process-wide instance every real
            :func:`~src.utils.timing.timed` call records into.
    """
    registry = metrics if metrics is not None else default_metrics_registry()
    operations = tuple(
        OperationMetrics(
            operation=stats.operation,
            count=stats.count,
            avg_ms=stats.avg_ms,
            min_ms=stats.min_ms,
            max_ms=stats.max_ms,
            last_ms=stats.last_ms,
        )
        for stats in registry.snapshot()
    )
    return PerformanceMetrics(operations=operations)


def build_workflow_status(*, registry: AgentRegistry, routing_fallback: tuple[str, ...]) -> WorkflowStatus:
    """Assemble :class:`~src.ai.monitoring.schemas.WorkflowStatus` from registry and routing configuration.

    Args:
        registry: The agent registry a real request would route
            through — only its registered names are read.
        routing_fallback: The fallback agent name(s) used when no
            keyword matches a request. Passed in rather than
            re-derived here, since :class:`~src.ai.agents.routing.KeywordRoutingStrategy`
            keeps its ``fallback`` private — the caller already has it
            (it's the same value used to construct the strategy).
    """
    handoffs = tuple(HandoffInfo(producer=producer, consumer_param=param) for producer, param in known_handoffs())
    return WorkflowStatus(
        agents=registry.names(),
        routing_fallback=tuple(name for name in routing_fallback if name in registry),
        handoffs=handoffs,
    )
