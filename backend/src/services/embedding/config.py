"""Configuration for the Ollama embedding provider."""

from __future__ import annotations

from dataclasses import dataclass

from src.config.settings import settings


@dataclass(frozen=True, slots=True)
class OllamaEmbeddingConfig:
    """Connection and model settings for :class:`~src.services.embedding.ollama_provider.OllamaEmbeddingProvider`.

    Attributes:
        model: Name of the Ollama embedding model to use (must already be
            pulled on the target Ollama instance, e.g. ``ollama pull nomic-embed-text``).
        base_url: URL of the running Ollama server.
    """

    model: str = settings.OLLAMA_EMBEDDING_MODEL
    base_url: str = settings.OLLAMA_BASE_URL

    def __post_init__(self) -> None:
        if not self.model.strip():
            raise ValueError("model must not be empty")
        if not self.base_url.strip():
            raise ValueError("base_url must not be empty")
