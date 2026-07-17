"""Configuration contract for the LLM service.

Same decoupling rule as :mod:`src.ai.config`: ``src.ai.llm`` must not
import FastAPI or ``src.config.settings`` directly. Callers (routes,
agents, scripts) build an :class:`LlmConfig` from whatever configuration
source they have — typically ``src.config.settings`` via
:func:`from_settings` — and pass it in explicitly.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class LlmConfig:
    """Runtime configuration for the Ollama-backed LLM service.

    Attributes:
        model: Ollama model name (e.g. ``"llama3.1:8b"``). Must already
            be pulled on the target Ollama instance
            (``ollama pull llama3.1:8b``). Configurable per call site —
            nothing in :mod:`src.ai.llm` hardcodes a model name beyond
            this default.
        base_url: URL of the running Ollama server.
        temperature: Sampling temperature. Kept low by default (0.2) so
            explanations stay grounded in the supplied context rather
            than creative.
    """

    model: str = "llama3.1:8b"
    base_url: str = "http://localhost:11434"
    temperature: float = 0.2

    def __post_init__(self) -> None:
        if not self.model.strip():
            raise ValueError("LlmConfig.model must not be empty")
        if not self.base_url.strip():
            raise ValueError("LlmConfig.base_url must not be empty")
        if not 0.0 <= self.temperature <= 2.0:
            raise ValueError("LlmConfig.temperature must be between 0.0 and 2.0")


def from_settings(settings: object) -> LlmConfig:
    """Build an :class:`LlmConfig` from an app settings object.

    Accepts ``object`` rather than ``src.config.settings.Settings`` to
    avoid importing the FastAPI-side settings module from within
    ``src.ai`` — duck-typed on the three ``OLLAMA_*`` attributes
    instead. Callers in ``src.routes`` or ``src.services`` pass the real
    ``settings`` singleton; tests can pass any object exposing the same
    attributes.
    """
    return LlmConfig(
        model=getattr(settings, "OLLAMA_LLM_MODEL"),
        base_url=getattr(settings, "OLLAMA_BASE_URL"),
        temperature=getattr(settings, "OLLAMA_LLM_TEMPERATURE"),
    )
