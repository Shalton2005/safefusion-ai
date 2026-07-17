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
        timeout_seconds: Maximum time to wait for an embedding call
            before giving up. Without this, a hung or unreachable Ollama
            server blocks the calling request (RAG retrieval, document
            ingestion) indefinitely — see
            :class:`~src.ai.exceptions.EmbeddingUnavailableError`.
    """

    model: str = settings.OLLAMA_EMBEDDING_MODEL
    base_url: str = settings.OLLAMA_BASE_URL
    timeout_seconds: float = settings.OLLAMA_EMBEDDING_TIMEOUT_SECONDS

    def __post_init__(self) -> None:
        if not self.model.strip():
            raise ValueError("model must not be empty")
        if not self.base_url.strip():
            raise ValueError("base_url must not be empty")
        if self.timeout_seconds <= 0.0:
            raise ValueError("timeout_seconds must be positive")
