"""Structured output contracts for the AI Safety Copilot.

Every Copilot operation (query, explain, recommend, chat — see
``service.py``) returns a dataclass built around a shared
:class:`ReasoningMetadata` block, so a caller (the FastAPI routes in
``src/routes/ai_copilot.py``) can render "why did the Copilot say this"
consistently across all four endpoints instead of each one inventing
its own trace shape.

No FastAPI import anywhere in this module — these are plain dataclasses,
converted to Pydantic response models at the route layer.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from src.ai.agents.explainability_service import ExplainabilityReport
from src.ai.agents.response_aggregator import UnifiedResponse


@dataclass(frozen=True, slots=True)
class AgentTrace:
    """Reasoning metadata for one agent the Supervisor executed.

    Attributes:
        agent: Registry name of the agent (e.g. ``"risk"``).
        ok: Whether the agent succeeded.
        summary: The agent's own one-line summary of what it found.
        citations: Supporting references the agent returned (RAG
            sources, compliance rule codes, etc.), if any.
        error: Failure reason, if ``ok`` is ``False``.
    """

    agent: str
    ok: bool
    summary: str
    citations: tuple[str, ...] = field(default_factory=tuple)
    error: str | None = None


@dataclass(frozen=True, slots=True)
class ReasoningMetadata:
    """Trace of how a Copilot response was produced — the "explainability" contract.

    Attributes:
        route: Ordered agent names the Supervisor's routing strategy
            selected and executed.
        agent_traces: One :class:`AgentTrace` per executed agent, in
            execution order. A failed agent still gets a trace here
            (``ok=False``, ``error`` set) — see each agent's ``run()``
            in ``src/ai/agents/*.py``.
        model: Name of the LLM model used for generation, if this
            operation invoked :class:`~src.ai.llm.service.LlmService`.
            ``None`` for operations that only aggregate agent output
            (e.g. ``/ai/recommend``) without an LLM call, *or* when an
            LLM call was attempted but failed — see ``warnings``.
        warnings: Human-readable notes about degraded external
            dependencies that this response's caller should know about
            (e.g. "Ollama unavailable — falling back to the aggregated
            agent summary", "graph_knowledge agent failed: Neo4j
            unreachable"). Empty when nothing degraded. Distinct from a
            failed :class:`AgentTrace` — a warning here can describe a
            *whole-operation* fallback (like the LLM call in
            :meth:`~src.ai.copilot.service.AiCopilotService.explain`)
            that isn't any single agent's failure.
    """

    route: tuple[str, ...]
    agent_traces: tuple[AgentTrace, ...]
    model: str | None = None
    warnings: tuple[str, ...] = field(default_factory=tuple)

    @property
    def ok(self) -> bool:
        return all(trace.ok for trace in self.agent_traces) and not self.warnings


@dataclass(frozen=True, slots=True)
class QueryResult:
    """Result of ``POST /ai/query`` — aggregated Supervisor output for a general question."""

    request_text: str
    summary: str
    agent_data: dict[str, Any]
    reasoning: ReasoningMetadata


@dataclass(frozen=True, slots=True)
class ExplainResult:
    """Result of ``POST /ai/explain`` — an LLM-generated, context-grounded explanation."""

    request_text: str
    answer: str
    explanation: str
    reasoning: ReasoningMetadata


@dataclass(frozen=True, slots=True)
class Recommendation:
    """One recommendation surfaced from an agent's structured output.

    Attributes:
        source_agent: Which agent produced this recommendation.
        zone: The zone it applies to, if the source agent is zone-scoped
            (Risk, Emergency). ``None`` for agents with no zone concept
            (Compliance).
        text: The recommendation itself.
    """

    source_agent: str
    text: str
    zone: str | None = None


@dataclass(frozen=True, slots=True)
class RecommendResult:
    """Result of ``POST /ai/recommend`` — recommendations aggregated across agents."""

    request_text: str
    recommendations: tuple[Recommendation, ...]
    reasoning: ReasoningMetadata


@dataclass(frozen=True, slots=True)
class ChatTurn:
    """One turn of chat history, as accepted by ``POST /ai/chat``."""

    role: str
    content: str


@dataclass(frozen=True, slots=True)
class ChatResult:
    """Result of ``POST /ai/chat`` — a conversational, context-grounded reply."""

    reply: str
    explanation: str
    reasoning: ReasoningMetadata


@dataclass(frozen=True, slots=True)
class SummaryResult:
    """Result of ``POST /ai/summary`` — the Response Aggregator's unified six-section output.

    Thin wrapper around :class:`~src.ai.agents.response_aggregator.UnifiedResponse`
    that adds ``request_text`` and ``reasoning``, matching every other
    Copilot result's shape. No LLM call — the aggregator that builds
    ``unified`` is purely deterministic (see
    ``src/ai/agents/response_aggregator.py``).
    """

    request_text: str
    unified: UnifiedResponse
    reasoning: ReasoningMetadata


@dataclass(frozen=True, slots=True)
class ExplainabilityResult:
    """Result of ``POST /ai/explainability`` — the Explainability Service's structured report.

    Thin wrapper around
    :class:`~src.ai.agents.explainability_service.ExplainabilityReport`
    that adds ``request_text`` and ``reasoning``, matching every other
    Copilot result's shape. No LLM call — the report is purely
    deterministic (see ``src/ai/agents/explainability_service.py``).
    Not to be confused with ``POST /ai/explain``, which *does* call the
    LLM to generate a natural-language answer; this endpoint explains
    *how* a response was produced, not what the answer to a question is.
    """

    request_text: str
    report: ExplainabilityReport
    reasoning: ReasoningMetadata
