"""Tests for the RAG API routes.

Exercises the actual FastAPI app (Route -> Service, structured JSON
response) with the service dependency overridden by a fake, rather than
mocking at the HTTP-client level. No live database or Ollama instance is
required — ``get_rag_service`` is swapped out entirely.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from server import app
from src.routes.rag import get_rag_service
from src.services.rag.rag_service import RagService
from src.services.rag.schemas import RetrievedChunk


class FakeRagService:
    """Stand-in for ``RagService`` returning fixed, inspectable results."""

    def __init__(self) -> None:
        self.search_documents_calls: list[dict] = []
        self.semantic_search_calls: list[dict] = []
        self.query_calls: list[dict] = []

    def search_documents(self, *, source: str) -> list[RetrievedChunk]:
        self.search_documents_calls.append({"source": source})
        if source == "missing.pdf":
            return []
        return [
            RetrievedChunk(
                id="1", content="Workers must wear PPE.", source=source,
                title="OISD Guideline", file_type="pdf", chunk_index=0, similarity=None,
            ),
            RetrievedChunk(
                id="2", content="Permits expire after 24 hours.", source=source,
                title="OISD Guideline", file_type="pdf", chunk_index=1, similarity=None,
            ),
        ]

    def semantic_search(self, *, query: str, limit: int = 5, min_similarity: float | None = None) -> list[RetrievedChunk]:
        self.semantic_search_calls.append({"query": query, "limit": limit, "min_similarity": min_similarity})
        return [
            RetrievedChunk(
                id="1", content="Workers must wear certified PPE.", source="oisd-guideline.pdf",
                title="OISD Guideline", file_type="pdf", chunk_index=0, similarity=0.93,
            ),
        ]

    def query(self, *, question: str, limit: int = 5, min_similarity: float | None = None) -> list[RetrievedChunk]:
        self.query_calls.append({"question": question, "limit": limit, "min_similarity": min_similarity})
        return [
            RetrievedChunk(
                id="3", content="Gas leaks require immediate evacuation.", source="incident-42.txt",
                title="Incident 42", file_type="text", chunk_index=0, similarity=0.88,
            ),
        ]


def _client_with_fake_service(fake_service: RagService):
    app.dependency_overrides[get_rag_service] = lambda: fake_service
    client = TestClient(app)
    return client


def _reset_overrides() -> None:
    app.dependency_overrides.pop(get_rag_service, None)


class TestSearchDocumentsRoute:
    def test_returns_structured_json_with_chunks(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.get("/api/v1/rag/documents", params={"source": "oisd-guideline.pdf"})
        finally:
            _reset_overrides()

        assert response.status_code == 200
        body = response.json()
        assert body["source"] == "oisd-guideline.pdf"
        assert body["chunk_count"] == 2
        assert len(body["chunks"]) == 2
        assert body["chunks"][0]["content"] == "Workers must wear PPE."
        assert body["chunks"][0]["similarity"] is None

    def test_calls_service_with_query_param(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            client.get("/api/v1/rag/documents", params={"source": "factory-act.md"})
        finally:
            _reset_overrides()

        assert fake_service.search_documents_calls == [{"source": "factory-act.md"}]

    def test_returns_empty_chunks_for_unknown_source(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.get("/api/v1/rag/documents", params={"source": "missing.pdf"})
        finally:
            _reset_overrides()

        assert response.status_code == 200
        assert response.json() == {"source": "missing.pdf", "chunk_count": 0, "chunks": []}

    def test_missing_source_param_returns_422(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.get("/api/v1/rag/documents")
        finally:
            _reset_overrides()

        assert response.status_code == 422


class TestSemanticSearchRoute:
    def test_returns_structured_json_with_similarity_ranked_results(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.post("/api/v1/rag/search", json={"query": "what PPE is required?"})
        finally:
            _reset_overrides()

        assert response.status_code == 200
        body = response.json()
        assert body["query"] == "what PPE is required?"
        assert body["result_count"] == 1
        assert body["results"][0]["similarity"] == 0.93

    def test_passes_limit_and_min_similarity_through(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            client.post(
                "/api/v1/rag/search",
                json={"query": "gas leak procedure", "limit": 10, "min_similarity": 0.5},
            )
        finally:
            _reset_overrides()

        assert fake_service.semantic_search_calls == [
            {"query": "gas leak procedure", "limit": 10, "min_similarity": 0.5}
        ]

    def test_blank_query_returns_422(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.post("/api/v1/rag/search", json={"query": ""})
        finally:
            _reset_overrides()

        assert response.status_code == 422

    def test_response_never_contains_an_answer_field(self) -> None:
        # No LLM call happens on this endpoint — confirm the response shape
        # doesn't leak a generated-answer field.
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.post("/api/v1/rag/search", json={"query": "ppe"})
        finally:
            _reset_overrides()

        assert "answer" not in response.json()


class TestQueryRoute:
    def test_returns_structured_json_with_context_chunks(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.post(
                "/api/v1/rag/query", json={"question": "what happens after a gas leak?"}
            )
        finally:
            _reset_overrides()

        assert response.status_code == 200
        body = response.json()
        assert body["question"] == "what happens after a gas leak?"
        assert len(body["context_chunks"]) == 1
        assert body["context_chunks"][0]["source"] == "incident-42.txt"

    def test_response_has_no_answer_field(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.post("/api/v1/rag/query", json={"question": "anything"})
        finally:
            _reset_overrides()

        body = response.json()
        assert "answer" not in body
        assert set(body.keys()) == {"question", "context_chunks"}

    def test_blank_question_returns_422(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.post("/api/v1/rag/query", json={"question": ""})
        finally:
            _reset_overrides()

        assert response.status_code == 422

    def test_limit_out_of_range_returns_422(self) -> None:
        fake_service = FakeRagService()
        client = _client_with_fake_service(fake_service)
        try:
            response = client.post("/api/v1/rag/query", json={"question": "x", "limit": 100})
        finally:
            _reset_overrides()

        assert response.status_code == 422
