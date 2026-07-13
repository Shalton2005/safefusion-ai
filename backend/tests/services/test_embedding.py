"""Tests for the provider-agnostic embedding service."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from src.services.chunking.schemas import Chunk
from src.services.embedding.config import OllamaEmbeddingConfig
from src.services.embedding.schemas import EmbeddedChunk
from src.services.embedding.service import EmbeddingService


class FakeEmbeddingProvider:
    """In-memory ``EmbeddingProviderPort`` implementation for testing ``EmbeddingService``.

    Returns deterministic, fixed-width vectors derived from text length so
    assertions can check "same text -> same vector" without a real model.
    """

    def __init__(self, model_name: str = "fake-model", dimensions: int = 4) -> None:
        self._model_name = model_name
        self._dimensions = dimensions
        self.embed_texts_calls: list[list[str]] = []
        self.embed_query_calls: list[str] = []

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        self.embed_texts_calls.append(texts)
        return [self._vector_for(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        self.embed_query_calls.append(text)
        return self._vector_for(text)

    def _vector_for(self, text: str) -> list[float]:
        return [float(len(text))] * self._dimensions


class TestEmbeddingServiceEmbedChunks:
    def test_returns_empty_list_for_empty_input(self) -> None:
        service = EmbeddingService(FakeEmbeddingProvider())
        assert service.embed_chunks([]) == []

    def test_empty_input_does_not_call_provider(self) -> None:
        provider = FakeEmbeddingProvider()
        EmbeddingService(provider).embed_chunks([])
        assert provider.embed_texts_calls == []

    def test_embeds_single_chunk(self) -> None:
        provider = FakeEmbeddingProvider(dimensions=3)
        service = EmbeddingService(provider)
        chunk = Chunk(content="hello world", metadata={"source": "a.txt"})

        [result] = service.embed_chunks([chunk])

        assert isinstance(result, EmbeddedChunk)
        assert result.content == "hello world"
        assert result.embedding == [11.0, 11.0, 11.0]
        assert result.model_name == "fake-model"

    def test_preserves_metadata_unchanged(self) -> None:
        provider = FakeEmbeddingProvider()
        service = EmbeddingService(provider)
        metadata = {"source": "policy.pdf", "chunk_index": 2, "title": "Policy"}
        chunk = Chunk(content="text", metadata=metadata)

        [result] = service.embed_chunks([chunk])

        assert result.metadata == metadata

    def test_preserves_order_across_batch(self) -> None:
        provider = FakeEmbeddingProvider()
        service = EmbeddingService(provider)
        chunks = [
            Chunk(content="a", metadata={"chunk_index": 0}),
            Chunk(content="bb", metadata={"chunk_index": 1}),
            Chunk(content="ccc", metadata={"chunk_index": 2}),
        ]

        results = service.embed_chunks(chunks)

        assert [r.content for r in results] == ["a", "bb", "ccc"]
        assert [r.metadata["chunk_index"] for r in results] == [0, 1, 2]

    def test_batches_all_chunks_in_a_single_provider_call(self) -> None:
        provider = FakeEmbeddingProvider()
        service = EmbeddingService(provider)
        chunks = [Chunk(content=f"chunk {i}", metadata={}) for i in range(5)]

        service.embed_chunks(chunks)

        assert len(provider.embed_texts_calls) == 1
        assert provider.embed_texts_calls[0] == [c.content for c in chunks]

    def test_embed_chunk_singular_wraps_embed_chunks(self) -> None:
        provider = FakeEmbeddingProvider()
        service = EmbeddingService(provider)
        chunk = Chunk(content="solo chunk", metadata={"source": "a.txt"})

        result = service.embed_chunk(chunk)

        assert isinstance(result, EmbeddedChunk)
        assert result.content == "solo chunk"

    def test_model_name_property_reflects_provider(self) -> None:
        provider = FakeEmbeddingProvider(model_name="nomic-embed-text")
        service = EmbeddingService(provider)
        assert service.model_name == "nomic-embed-text"


class TestEmbeddingServiceEmbedQuery:
    def test_delegates_to_provider(self) -> None:
        provider = FakeEmbeddingProvider(dimensions=2)
        service = EmbeddingService(provider)

        vector = service.embed_query("search text")

        assert vector == [11.0, 11.0]
        assert provider.embed_query_calls == ["search text"]


class TestOllamaEmbeddingConfig:
    def test_defaults_pull_from_settings(self) -> None:
        config = OllamaEmbeddingConfig()
        assert config.model == "nomic-embed-text"
        assert config.base_url.startswith("http")

    def test_rejects_empty_model(self) -> None:
        with pytest.raises(ValueError, match="model"):
            OllamaEmbeddingConfig(model="", base_url="http://localhost:11434")

    def test_rejects_empty_base_url(self) -> None:
        with pytest.raises(ValueError, match="base_url"):
            OllamaEmbeddingConfig(model="nomic-embed-text", base_url="")

    def test_accepts_explicit_overrides(self) -> None:
        config = OllamaEmbeddingConfig(model="custom-model", base_url="http://ollama.internal:11434")
        assert config.model == "custom-model"
        assert config.base_url == "http://ollama.internal:11434"


class TestOllamaEmbeddingProvider:
    def _make_provider(self, mock_embeddings: MagicMock):
        with patch("langchain_ollama.OllamaEmbeddings", return_value=mock_embeddings):
            from src.services.embedding.ollama_provider import OllamaEmbeddingProvider

            return OllamaEmbeddingProvider(
                OllamaEmbeddingConfig(model="nomic-embed-text", base_url="http://localhost:11434")
            )

    def test_model_name_reflects_config(self) -> None:
        provider = self._make_provider(MagicMock())
        assert provider.model_name == "nomic-embed-text"

    def test_embed_texts_delegates_to_langchain_client(self) -> None:
        mock_embeddings = MagicMock()
        mock_embeddings.embed_documents.return_value = [[0.1, 0.2], [0.3, 0.4]]
        provider = self._make_provider(mock_embeddings)

        result = provider.embed_texts(["first", "second"])

        assert result == [[0.1, 0.2], [0.3, 0.4]]
        mock_embeddings.embed_documents.assert_called_once_with(["first", "second"])

    def test_embed_texts_raises_for_empty_input(self) -> None:
        provider = self._make_provider(MagicMock())
        with pytest.raises(ValueError, match="texts"):
            provider.embed_texts([])

    def test_embed_texts_raises_on_vector_count_mismatch(self) -> None:
        mock_embeddings = MagicMock()
        mock_embeddings.embed_documents.return_value = [[0.1, 0.2]]  # only 1, but 2 inputs given
        provider = self._make_provider(mock_embeddings)

        with pytest.raises(ValueError, match="Ollama returned"):
            provider.embed_texts(["first", "second"])

    def test_embed_query_delegates_to_langchain_client(self) -> None:
        mock_embeddings = MagicMock()
        mock_embeddings.embed_query.return_value = [0.5, 0.6, 0.7]
        provider = self._make_provider(mock_embeddings)

        result = provider.embed_query("search text")

        assert result == [0.5, 0.6, 0.7]
        mock_embeddings.embed_query.assert_called_once_with("search text")

    def test_embed_query_raises_for_empty_text(self) -> None:
        provider = self._make_provider(MagicMock())
        with pytest.raises(ValueError, match="text"):
            provider.embed_query("")

    def test_dimensions_populated_after_first_embed_call(self) -> None:
        mock_embeddings = MagicMock()
        mock_embeddings.embed_documents.return_value = [[0.1] * 768]
        provider = self._make_provider(mock_embeddings)

        provider.embed_texts(["one document"])

        assert provider.dimensions == 768

    def test_dimensions_has_default_before_any_embed_call(self) -> None:
        provider = self._make_provider(MagicMock())
        assert provider.dimensions == 768
