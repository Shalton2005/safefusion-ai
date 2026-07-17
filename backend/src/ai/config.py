"""Configuration contract for the AI package.

``src/ai`` must not import FastAPI or ``src.config.settings`` directly —
that would couple graph/agent code to the web layer and make it
impossible to unit-test or reuse outside a request. Instead, callers
(routes, workers, scripts) build a :class:`GraphConfig` from whatever
configuration source they have — typically ``src.config.settings`` — and
pass it in explicitly.

See ``src/ai/graph/builder.py`` for how this is consumed.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GraphConfig:
    """Runtime configuration for a LangGraph workflow.

    Attributes:
        model: Anthropic model ID (e.g. ``"claude-opus-4-8"``).
        api_key: Anthropic API key. Empty string means "unset" — resolving
            an LLM client with an empty key must fail fast at construction
            time, not silently fall back to an environment variable.
        max_tokens: Upper bound on a single LLM call's output tokens.
    """

    model: str
    api_key: str
    max_tokens: int = 4096

    def __post_init__(self) -> None:
        if not self.model.strip():
            raise ValueError("GraphConfig.model must not be empty")
        if self.max_tokens <= 0:
            raise ValueError("GraphConfig.max_tokens must be positive")


def from_settings(settings: object) -> GraphConfig:
    """Build a :class:`GraphConfig` from an app settings object.

    Accepts ``object`` rather than ``src.config.settings.Settings`` to
    avoid importing the FastAPI-side settings module from within
    ``src.ai`` — duck-typed on the four ``LANGGRAPH_*`` /
    ``ANTHROPIC_API_KEY`` attributes instead. Callers in ``src.routes``
    or ``src.services`` pass the real ``settings`` singleton; tests can
    pass any object exposing the same attributes.
    """
    return GraphConfig(
        model=getattr(settings, "LANGGRAPH_MODEL"),
        api_key=getattr(settings, "ANTHROPIC_API_KEY"),
        max_tokens=getattr(settings, "LANGGRAPH_MAX_TOKENS"),
    )
