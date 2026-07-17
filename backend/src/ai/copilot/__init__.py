"""AI Safety Copilot — the shared implementation behind the ``/ai/*`` FastAPI routes.

Public surface:
    - :class:`~src.ai.copilot.service.AiCopilotService` — implements
      query/explain/recommend/chat over the LangGraph-compiled AI
      Supervisor (see ``src/ai/graph``), optionally grounding
      ``explain``/``chat`` in :class:`~src.ai.llm.service.LlmService`
      generation.
    - :mod:`src.ai.copilot.schemas` — result dataclasses
      (``QueryResult``, ``ExplainResult``, ``RecommendResult``,
      ``ChatResult``) built around a shared ``ReasoningMetadata`` block,
      so every endpoint surfaces "why" consistently.

No FastAPI import anywhere in this package — ``src/routes/ai_copilot.py``
is the only place that translates these dataclasses into Pydantic
response models.
"""

from src.ai.copilot.schemas import (
    AgentTrace,
    ChatResult,
    ExplainResult,
    QueryResult,
    Recommendation,
    RecommendResult,
    ReasoningMetadata,
)
from src.ai.copilot.service import AiCopilotService


__all__ = [
    "AiCopilotService",
    "AgentTrace",
    "ReasoningMetadata",
    "QueryResult",
    "ExplainResult",
    "Recommendation",
    "RecommendResult",
    "ChatResult",
]
