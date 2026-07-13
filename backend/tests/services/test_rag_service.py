"""Tests for the RAG retrieval service."""

from __future__ import annotations

from unittest.mock import MagicMock

from src.repositories.document_embedding import SimilarityMatch
from src.services.rag.rag_service import RagService
from src.services.rag.schemas import RetrievedChunk


class FakeQueryEmbedder:
    """In-memory ``QueryEmbedderPort`` implementation for testing ``RagService``."""

    def __init__(self) -> None:
        self.embed_query_calls: list[str] = []

    def embed_query(self, text: str) -> list[float]:
        self.embed_query_calls.append(text)
        return [float(len(text))] * 4


def _mock_embedding_row(*, id_="row-1", content="chunk text", source="a.pdf", title="A", file_type="pdf", chunk_index=0):
    row = MagicMock()
    row.id = id_
    row.content = content
    row.source = source
    row.title = title
    row.file_type = file_type
    row.chunk_index = chunk_index
    return row


class TestRagServiceSearchDocuments:
    def test_returns_chunks_from_repository_in_order(self) -> None:
        repo = MagicMock()
        repo.get_by_source.return_value = [
            _mock_embedding_row(id_="1", chunk_index=0),
            _mock_embedding_row(id_="2", chunk_index=1),
        ]
        service = RagService(repository=repo, embedder=FakeQueryEmbedder())

        results = service.search_documents(source="oisd-guideline.pdf")

        assert len(results) == 2
        assert all(isinstance(r, RetrievedChunk) for r in results)
        assert [r.id for r in results] == ["1", "2"]
        repo.get_by_source.assert_called_once_with("oisd-guideline.pdf")

    def test_similarity_is_none_for_document_search(self) -> None:
        repo = MagicMock()
        repo.get_by_source.return_value = [_mock_embedding_row()]
        service = RagService(repository=repo, embedder=FakeQueryEmbedder())

        [result] = service.search_documents(source="a.pdf")

        assert result.similarity is None

    def test_returns_empty_list_when_no_chunks_found(self) -> None:
        repo = MagicMock()
        repo.get_by_source.return_value = []
        service = RagService(repository=repo, embedder=FakeQueryEmbedder())

        assert service.search_documents(source="missing.pdf") == []

    def test_does_not_call_embedder(self) -> None:
        repo = MagicMock()
        repo.get_by_source.return_value = []
        embedder = FakeQueryEmbedder()
        service = RagService(repository=repo, embedder=embedder)

        service.search_documents(source="a.pdf")

        assert embedder.embed_query_calls == []


class TestRagServiceSemanticSearch:
    def test_embeds_query_and_returns_ranked_results(self) -> None:
        repo = MagicMock()
        repo.search_by_cosine_similarity.return_value = [
            SimilarityMatch(embedding=_mock_embedding_row(id_="1"), similarity=0.95),
            SimilarityMatch(embedding=_mock_embedding_row(id_="2"), similarity=0.80),
        ]
        embedder = FakeQueryEmbedder()
        service = RagService(repository=repo, embedder=embedder)

        results = service.semantic_search(query="what PPE is required?")

        assert embedder.embed_query_calls == ["what PPE is required?"]
        assert [r.similarity for r in results] == [0.95, 0.80]
        assert [r.id for r in results] == ["1", "2"]

    def test_passes_limit_and_min_similarity_to_repository(self) -> None:
        repo = MagicMock()
        repo.search_by_cosine_similarity.return_value = []
        service = RagService(repository=repo, embedder=FakeQueryEmbedder())

        service.semantic_search(query="gas leak procedure", limit=10, min_similarity=0.5)

        repo.search_by_cosine_similarity.assert_called_once()
        _, kwargs = repo.search_by_cosine_similarity.call_args
        assert kwargs["limit"] == 10
        assert kwargs["min_similarity"] == 0.5

    def test_empty_query_returns_empty_list_without_calling_embedder_or_repository(self) -> None:
        repo = MagicMock()
        embedder = FakeQueryEmbedder()
        service = RagService(repository=repo, embedder=embedder)

        assert service.semantic_search(query="") == []
        assert service.semantic_search(query="   ") == []
        assert embedder.embed_query_calls == []
        repo.search_by_cosine_similarity.assert_not_called()

    def test_returns_empty_list_when_no_matches(self) -> None:
        repo = MagicMock()
        repo.search_by_cosine_similarity.return_value = []
        service = RagService(repository=repo, embedder=FakeQueryEmbedder())

        assert service.semantic_search(query="something") == []


class TestRagServiceQuery:
    def test_delegates_to_semantic_search(self) -> None:
        repo = MagicMock()
        repo.search_by_cosine_similarity.return_value = [
            SimilarityMatch(embedding=_mock_embedding_row(id_="1"), similarity=0.9),
        ]
        embedder = FakeQueryEmbedder()
        service = RagService(repository=repo, embedder=embedder)

        results = service.query(question="what happens if a permit expires?")

        assert embedder.embed_query_calls == ["what happens if a permit expires?"]
        assert len(results) == 1
        assert results[0].similarity == 0.9

    def test_query_does_not_produce_a_generated_answer(self) -> None:
        # RagService has no answer-generation method or field — retrieval only.
        repo = MagicMock()
        repo.search_by_cosine_similarity.return_value = []
        service = RagService(repository=repo, embedder=FakeQueryEmbedder())

        results = service.query(question="anything")

        assert results == []
        assert not hasattr(service, "generate_answer")
        assert not hasattr(service, "ask_llm")
