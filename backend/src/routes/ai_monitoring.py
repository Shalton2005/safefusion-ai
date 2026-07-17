"""AI Monitoring routes for SafeFusion AI API v1.

Exposes read-only observability over the AI layer, distinct from the
AI Safety Copilot's own request-serving endpoints (``src/routes/ai_copilot.py``):

    - ``GET /ai/status``   — which agents are registered, what routes to
      them, and which LLM/embedding models are configured. No I/O, no
      live probing — configuration only (mirrors the existing
      ``GET /api/v1/status``'s "configured, not live-checked" contract).
    - ``GET /ai/health``   — live reachability of every external
      dependency the AI layer needs (Neo4j, Ollama). Unlike
      ``GET /health`` (process liveness only), this actually probes both
      dependencies — the first real caller of
      :func:`~src.graph_database.driver.verify_connectivity` and
      :func:`~src.ai.llm.ollama_provider.check_ollama_reachable` in this
      codebase.
    - ``GET /ai/metrics``  — real observed operation durations
      (count/min/avg/max/last), aggregated in-process from every
      :func:`~src.utils.timing.timed` call across the AI layer since the
      last process start (or the last reset).
    - ``GET /ai/workflow`` — the Supervisor workflow's static shape:
      registered agents, routing fallback, known producer/consumer
      handoffs. Not live/historical execution state — no request
      execution history is persisted anywhere in this codebase (see
      ``src/ai/monitoring/service.py``'s module docstring for why).

This route module only translates between HTTP and
:mod:`src.ai.monitoring`'s dataclasses; all data assembly lives there,
independent of FastAPI.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from src.ai.agents.registry import AgentRegistry
from src.ai.monitoring.schemas import AiHealth, AiStatus, PerformanceMetrics, WorkflowStatus
from src.ai.monitoring.service import (
    build_ai_health,
    build_ai_status,
    build_performance_metrics,
    build_workflow_status,
    lightweight_agent_registry,
)
from src.config.settings import settings
from src.schemas.response.ai_monitoring import (
    AgentInfoResponse,
    AiHealthResponse,
    AiStatusResponse,
    DependencyHealthResponse,
    HandoffInfoResponse,
    OperationMetricsResponse,
    PerformanceMetricsResponse,
    WorkflowStatusResponse,
)

router: APIRouter = APIRouter(prefix="/ai", tags=["AI Monitoring"])


# ── Dependency: agent registry ──────────────────────────────────────────────


def get_monitoring_registry() -> AgentRegistry:
    """Provide the lightweight, zero-I/O agent registry monitoring endpoints read from.

    Deliberately not the same DI path :func:`~src.routes.ai_copilot.get_ai_copilot_service`
    uses — that one requires a live DB/Neo4j session to construct real
    engines. A monitoring endpoint that itself needs a live database
    connection just to report "what agents are registered" would defeat
    the purpose — see :func:`~src.ai.monitoring.service.lightweight_agent_registry`.
    """
    return lightweight_agent_registry()


RegistryDep = Annotated[AgentRegistry, Depends(get_monitoring_registry)]


# ── dataclass -> response model translation ─────────────────────────────────


def _status_to_response(status: AiStatus) -> AiStatusResponse:
    return AiStatusResponse(
        agents=[AgentInfoResponse(name=a.name, trigger_keywords=a.trigger_keywords) for a in status.agents],
        llm_model=status.llm_model,
        embedding_model=status.embedding_model,
        graph_database=status.graph_database,
        conversation_memory_max_turns=status.conversation_memory_max_turns,
    )


def _health_to_response(health: AiHealth) -> AiHealthResponse:
    return AiHealthResponse(
        healthy=health.healthy,
        dependencies=[
            DependencyHealthResponse(name=d.name, reachable=d.reachable, detail=d.detail)
            for d in health.dependencies
        ],
    )


def _metrics_to_response(metrics: PerformanceMetrics) -> PerformanceMetricsResponse:
    return PerformanceMetricsResponse(
        operations=[
            OperationMetricsResponse(
                operation=op.operation, count=op.count, avg_ms=op.avg_ms, min_ms=op.min_ms, max_ms=op.max_ms, last_ms=op.last_ms
            )
            for op in metrics.operations
        ]
    )


def _workflow_to_response(workflow: WorkflowStatus) -> WorkflowStatusResponse:
    return WorkflowStatusResponse(
        agents=workflow.agents,
        routing_fallback=workflow.routing_fallback,
        handoffs=[HandoffInfoResponse(producer=h.producer, consumer_param=h.consumer_param) for h in workflow.handoffs],
    )


# ── routes ────────────────────────────────────────────────────────────────────


@router.get(
    "/status",
    summary="AI layer configuration status",
    description=(
        "Reports which specialized agents are registered, the keywords "
        "that route a request to each, and which LLM/embedding models "
        "and knowledge-graph database are configured. Configuration "
        "only — does not probe live connectivity; see `GET /ai/health` "
        "for that."
    ),
    response_model=AiStatusResponse,
    response_description="AI layer configuration snapshot.",
)
def ai_status(registry: RegistryDep) -> AiStatusResponse:
    status = build_ai_status(
        registry=registry,
        llm_model=settings.OLLAMA_LLM_MODEL,
        embedding_model=settings.OLLAMA_EMBEDDING_MODEL,
        graph_database=settings.NEO4J_DATABASE,
        conversation_memory_max_turns=settings.CONVERSATION_MEMORY_MAX_TURNS,
    )
    return _status_to_response(status)


@router.get(
    "/health",
    summary="AI dependency readiness probe",
    description=(
        "Probes live reachability of every external dependency the AI "
        "layer needs: Neo4j (knowledge graph) and Ollama (LLM + "
        "embeddings). Unlike `GET /health` (process liveness only), "
        "this endpoint performs real connectivity checks and can take a "
        "few seconds if a dependency is slow or down."
    ),
    response_model=AiHealthResponse,
    response_description="Live reachability of each AI-layer dependency.",
)
def ai_health() -> AiHealthResponse:
    health = build_ai_health(ollama_base_url=settings.OLLAMA_BASE_URL)
    return _health_to_response(health)


@router.get(
    "/metrics",
    summary="AI operation performance metrics",
    description=(
        "Returns real observed duration statistics (count, avg, min, "
        "max, last) for every timed AI operation — agent execution, "
        "RAG retrieval, knowledge-graph queries, LLM generation, and "
        "overall Supervisor workflow duration — aggregated in-process "
        "since the last application start. An operation that has never "
        "run simply doesn't appear."
    ),
    response_model=PerformanceMetricsResponse,
    response_description="Aggregated duration statistics per operation.",
)
def ai_metrics() -> PerformanceMetricsResponse:
    metrics = build_performance_metrics()
    return _metrics_to_response(metrics)


@router.get(
    "/workflow",
    summary="AI Supervisor workflow shape",
    description=(
        "Reports the AI Supervisor workflow's static configuration: "
        "registered agents, the fallback agent used when no routing "
        "keyword matches, and known producer/consumer data handoffs "
        "(e.g. Risk feeding Emergency). Reflects workflow *shape*, not "
        "live or historical execution state — no per-request execution "
        "history is persisted in this deployment."
    ),
    response_model=WorkflowStatusResponse,
    response_description="Static shape of the Supervisor workflow.",
)
def ai_workflow(registry: RegistryDep) -> WorkflowStatusResponse:
    workflow = build_workflow_status(registry=registry, routing_fallback=("knowledge",))
    return _workflow_to_response(workflow)
