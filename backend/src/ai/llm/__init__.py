"""Ollama-backed LLM generation for SafeFusion AI.

Public surface:
    - :class:`~src.ai.llm.service.LlmService` / :class:`~src.ai.llm.service.LlmResponse` —
      the reusable generation service and its explainable (answer +
      reasoning) output.
    - :class:`~src.ai.llm.context.LlmContext` / :class:`~src.ai.llm.context.RagContextItem` /
      :class:`~src.ai.llm.context.GraphContextItem` / :class:`~src.ai.llm.context.RiskContextItem` —
      typed context accepted from RAG, the knowledge graph, and the Risk
      Engine.
    - :class:`~src.ai.llm.config.LlmConfig` / :func:`~src.ai.llm.config.from_settings` —
      runtime configuration (model, base URL, temperature), decoupled
      from ``src.config.settings`` per the same rule as ``src.ai.config``.
    - :class:`~src.ai.llm.port.LlmProviderPort` / :class:`~src.ai.llm.ollama_provider.OllamaLlmProvider` —
      the provider seam and its default Ollama implementation
      (``llama3.1:8b`` by default, configurable via ``OLLAMA_LLM_MODEL``).

Prompt text is centralized in :mod:`src.ai.prompts` (not in this
package) — no module here assembles prompt strings inline;
:class:`~src.ai.llm.service.LlmService` only selects a template by
domain and passes the question/context through it. No FastAPI import
anywhere in this package.
"""

from src.ai.llm.config import LlmConfig, from_settings
from src.ai.llm.context import GraphContextItem, LlmContext, RagContextItem, RiskContextItem
from src.ai.llm.ollama_provider import OllamaLlmProvider
from src.ai.llm.port import LlmProviderPort
from src.ai.llm.service import LlmResponse, LlmService


__all__ = [
    "LlmConfig",
    "from_settings",
    "LlmContext",
    "RagContextItem",
    "GraphContextItem",
    "RiskContextItem",
    "LlmProviderPort",
    "OllamaLlmProvider",
    "LlmService",
    "LlmResponse",
]
