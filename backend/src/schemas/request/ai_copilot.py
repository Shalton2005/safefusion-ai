"""AI Safety Copilot request models (Pydantic v2)."""

from typing import Any

from pydantic import Field

from src.schemas.base import AppBaseModel


class AiQueryRequest(AppBaseModel):
    """Request body for ``POST /ai/query``."""

    text: str = Field(..., min_length=1, max_length=2000, description="Natural-language question or request.")
    params: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional structured parameters (e.g. zone_id, worker_id) agents may use instead of parsing them out of `text`.",
    )


class AiExplainRequest(AppBaseModel):
    """Request body for ``POST /ai/explain``."""

    text: str = Field(..., min_length=1, max_length=2000, description="What to explain, in natural language.")
    params: dict[str, Any] = Field(default_factory=dict, description="Optional structured parameters.")


class AiRecommendRequest(AppBaseModel):
    """Request body for ``POST /ai/recommend``."""

    text: str = Field(..., min_length=1, max_length=2000, description="Situation to get recommendations for.")
    params: dict[str, Any] = Field(default_factory=dict, description="Optional structured parameters.")


class AiSummaryRequest(AppBaseModel):
    """Request body for ``POST /ai/summary``."""

    text: str = Field(..., min_length=1, max_length=2000, description="Natural-language question or request.")
    params: dict[str, Any] = Field(default_factory=dict, description="Optional structured parameters.")


class AiChatMessage(AppBaseModel):
    """One turn of prior chat history."""

    role: str = Field(..., description="'user' or 'assistant'.")
    content: str = Field(..., min_length=1, max_length=4000)


class AiChatRequest(AppBaseModel):
    """Request body for ``POST /ai/chat``.

    ``history`` is accepted for client-side display continuity; the
    Supervisor and LLM call operate on ``message`` alone today — see
    ``src/ai/copilot/service.py:AiCopilotService.chat``.
    """

    message: str = Field(..., min_length=1, max_length=2000, description="The user's chat message.")
    history: list[AiChatMessage] = Field(default_factory=list, description="Prior turns in the conversation, oldest first.")
    params: dict[str, Any] = Field(default_factory=dict, description="Optional structured parameters.")
