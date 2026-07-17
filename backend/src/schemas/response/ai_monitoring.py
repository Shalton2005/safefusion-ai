"""Response schemas for the AI monitoring endpoints (GET /ai/status, /ai/health, /ai/metrics, /ai/workflow)."""

from src.schemas.base import AppBaseModel


class AgentInfoResponse(AppBaseModel):
    """One registered agent and the keywords that route a request to it."""

    name: str
    trigger_keywords: tuple[str, ...]


class AiStatusResponse(AppBaseModel):
    """Result payload for ``GET /ai/status`` — AI layer configuration, not live reachability."""

    agents: list[AgentInfoResponse]
    llm_model: str
    embedding_model: str
    graph_database: str
    conversation_memory_max_turns: int


class DependencyHealthResponse(AppBaseModel):
    """Reachability of one external dependency the AI layer needs."""

    name: str
    reachable: bool
    detail: str


class AiHealthResponse(AppBaseModel):
    """Result payload for ``GET /ai/health`` — live reachability of every AI-layer dependency."""

    healthy: bool
    dependencies: list[DependencyHealthResponse]


class OperationMetricsResponse(AppBaseModel):
    """Aggregated duration statistics for one timed operation."""

    operation: str
    count: int
    avg_ms: float
    min_ms: float
    max_ms: float
    last_ms: float


class PerformanceMetricsResponse(AppBaseModel):
    """Result payload for ``GET /ai/metrics`` — real observed durations since process start (or last reset)."""

    operations: list[OperationMetricsResponse]


class HandoffInfoResponse(AppBaseModel):
    """One producer -> consumer data handoff wired into the Supervisor's execution loop."""

    producer: str
    consumer_param: str


class WorkflowStatusResponse(AppBaseModel):
    """Result payload for ``GET /ai/workflow`` — the Supervisor workflow's static shape."""

    agents: tuple[str, ...]
    routing_fallback: tuple[str, ...]
    handoffs: list[HandoffInfoResponse]
