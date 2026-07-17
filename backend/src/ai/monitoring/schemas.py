"""Structured data contracts for the AI monitoring endpoints.

Plain dataclasses, no FastAPI import — same split every other `src.ai`
package uses (dataclasses here, Pydantic response models built from them
at the route layer in ``src/routes/ai_monitoring.py``). See
``service.py`` in this package for how each is assembled.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class AgentInfo:
    """One registered agent, as reported by ``GET /ai/status``."""

    name: str
    trigger_keywords: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class AiStatus:
    """Configuration snapshot of the AI layer — what's wired up, not whether it's reachable.

    Attributes:
        agents: Every agent the default registry would construct, with
            the keywords that route a request to it (empty tuple for an
            agent not covered by the default keyword table).
        llm_model: Configured Ollama chat model name.
        embedding_model: Configured Ollama embedding model name.
        graph_database: Configured Neo4j database name (not the URI —
            see :class:`AiHealth` for whether it's actually reachable).
        conversation_memory_max_turns: Configured
            :class:`~src.ai.memory.service.ConversationMemoryService`
            window size.
    """

    agents: tuple[AgentInfo, ...]
    llm_model: str
    embedding_model: str
    graph_database: str
    conversation_memory_max_turns: int


@dataclass(frozen=True, slots=True)
class DependencyHealth:
    """Reachability of one external dependency, as reported by ``GET /ai/health``."""

    name: str
    reachable: bool
    detail: str


@dataclass(frozen=True, slots=True)
class AiHealth:
    """Live reachability of every external dependency the AI layer needs.

    Attributes:
        dependencies: One :class:`DependencyHealth` per checked
            dependency (today: Neo4j, Ollama).
    """

    dependencies: tuple[DependencyHealth, ...]

    @property
    def healthy(self) -> bool:
        """``True`` only if every checked dependency is reachable."""
        return all(dep.reachable for dep in self.dependencies)


@dataclass(frozen=True, slots=True)
class OperationMetrics:
    """Aggregated duration statistics for one timed operation, as reported by ``GET /ai/metrics``."""

    operation: str
    count: int
    avg_ms: float
    min_ms: float
    max_ms: float
    last_ms: float


@dataclass(frozen=True, slots=True)
class PerformanceMetrics:
    """Every operation's aggregated timing, since process start or the last reset.

    Attributes:
        operations: One :class:`OperationMetrics` per operation name
            that has been recorded at least once (see
            :mod:`src.utils.metrics`) — an operation with zero
            observations (e.g. the Graph Knowledge agent never ran)
            simply doesn't appear, rather than showing as zeroes.
    """

    operations: tuple[OperationMetrics, ...]


@dataclass(frozen=True, slots=True)
class HandoffInfo:
    """One producer -> consumer data handoff wired into the Supervisor's execution loop."""

    producer: str
    consumer_param: str


@dataclass(frozen=True, slots=True)
class WorkflowStatus:
    """Static shape of the AI Supervisor workflow — what would run and in what order.

    Not live/historical execution state: no request execution history is
    persisted anywhere in this codebase (see this package's ``service.py``
    module docstring), so this reports the workflow's *configuration* —
    registered agents, routing table, and known handoffs — rather than
    fabricating per-request state that doesn't exist.

    Attributes:
        agents: Every registered agent name, in registration order.
        routing_fallback: Agent(s) used when no keyword matches a
            request (see
            :func:`~src.ai.agents.routing.default_keyword_routes`).
        handoffs: Known producer -> consumer data dependencies (e.g.
            Risk's zone results feeding Emergency) — see
            ``src/ai/agents/supervisor.py``'s ``_HANDOFFS`` table.
    """

    agents: tuple[str, ...]
    routing_fallback: tuple[str, ...]
    handoffs: tuple[HandoffInfo, ...] = field(default_factory=tuple)
