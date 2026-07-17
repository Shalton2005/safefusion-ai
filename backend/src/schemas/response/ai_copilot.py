"""AI Safety Copilot response models (Pydantic v2).

Every response includes a ``reasoning`` block (see
:class:`ReasoningMetadataResponse`) — the executed agent route, each
agent's own summary/citations/success state, and (for LLM-backed
endpoints) which model generated the answer. This is the "include
reasoning metadata where available" requirement made concrete: metadata
is always present when the Supervisor ran at least one agent, and
``model`` is null when no LLM call was involved (``/ai/query`` and
``/ai/recommend`` are pure aggregation; ``/ai/explain`` and ``/ai/chat``
populate it when an LLM service is configured).
"""

from typing import Any

from src.schemas.base import AppBaseModel


class AgentTraceResponse(AppBaseModel):
    """Reasoning metadata for one agent the Supervisor executed."""

    agent: str
    ok: bool
    summary: str
    citations: tuple[str, ...] = ()
    error: str | None = None


class ReasoningMetadataResponse(AppBaseModel):
    """Trace of how a Copilot response was produced."""

    route: tuple[str, ...]
    agent_traces: list[AgentTraceResponse]
    model: str | None = None


class AiQueryResponse(AppBaseModel):
    """Result payload for ``POST /ai/query``."""

    request_text: str
    summary: str
    agent_data: dict[str, Any]
    reasoning: ReasoningMetadataResponse


class AiExplainResponse(AppBaseModel):
    """Result payload for ``POST /ai/explain``."""

    request_text: str
    answer: str
    explanation: str
    reasoning: ReasoningMetadataResponse


class RecommendationResponse(AppBaseModel):
    """One recommendation surfaced from an agent's structured output."""

    source_agent: str
    text: str
    zone: str | None = None


class AiRecommendResponse(AppBaseModel):
    """Result payload for ``POST /ai/recommend``."""

    request_text: str
    recommendations: list[RecommendationResponse]
    reasoning: ReasoningMetadataResponse


class AiChatResponse(AppBaseModel):
    """Result payload for ``POST /ai/chat``."""

    reply: str
    explanation: str
    reasoning: ReasoningMetadataResponse
