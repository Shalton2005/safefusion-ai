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
            execution order.
        model: Name of the LLM model used for generation, if this
            operation invoked :class:`~src.ai.llm.service.LlmService`.
            ``None`` for operations that only aggregate agent output
            (e.g. ``/ai/recommend``) without an LLM call.
    """

    route: tuple[str, ...]
    agent_traces: tuple[AgentTrace, ...]
    model: str | None = None

    @property
    def ok(self) -> bool:
        return all(trace.ok for trace in self.agent_traces)


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
