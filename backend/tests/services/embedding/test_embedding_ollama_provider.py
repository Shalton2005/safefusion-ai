"""Tests for OllamaEmbeddingProvider's failure handling (src.services.embedding.ollama_provider)."""

from __future__ import annotations

import time

import pytest

from src.services.embedding.config import OllamaEmbeddingConfig
from src.services.embedding.exceptions import EmbeddingUnavailableError
from src.services.embedding.ollama_provider import OllamaEmbeddingProvider

_UNREACHABLE_BASE_URL = "http://localhost:1"


class TestOllamaEmbeddingProviderFailureHandling:
    def test_unreachable_server_raises_embedding_unavailable_error_on_query(self) -> None:
        provider = OllamaEmbeddingProvider(OllamaEmbeddingConfig(base_url=_UNREACHABLE_BASE_URL, timeout_seconds=2.0))

        with pytest.raises(EmbeddingUnavailableError):
            provider.embed_query("hello")

    def test_unreachable_server_raises_embedding_unavailable_error_on_batch(self) -> None:
        provider = OllamaEmbeddingProvider(OllamaEmbeddingConfig(base_url=_UNREACHABLE_BASE_URL, timeout_seconds=2.0))

        with pytest.raises(EmbeddingUnavailableError):
            provider.embed_texts(["a", "b"])

    def test_unreachable_server_fails_within_a_bounded_time(self) -> None:
        provider = OllamaEmbeddingProvider(OllamaEmbeddingConfig(base_url=_UNREACHABLE_BASE_URL, timeout_seconds=2.0))

        start = time.monotonic()
        with pytest.raises(EmbeddingUnavailableError):
            provider.embed_query("hello")
        elapsed = time.monotonic() - start

        assert elapsed < 30.0

    def test_empty_text_raises_value_error_before_any_network_call(self) -> None:
        provider = OllamaEmbeddingProvider(OllamaEmbeddingConfig(base_url=_UNREACHABLE_BASE_URL, timeout_seconds=2.0))

        with pytest.raises(ValueError):
            provider.embed_query("")

    def test_empty_texts_list_raises_value_error(self) -> None:
        provider = OllamaEmbeddingProvider(OllamaEmbeddingConfig(base_url=_UNREACHABLE_BASE_URL, timeout_seconds=2.0))

        with pytest.raises(ValueError):
            provider.embed_texts([])

    def test_config_rejects_non_positive_timeout(self) -> None:
        with pytest.raises(ValueError):
            OllamaEmbeddingConfig(timeout_seconds=0.0)
