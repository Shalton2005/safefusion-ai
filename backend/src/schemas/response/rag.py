"""Response schemas for the RAG retrieval API."""

from src.schemas.base import AppBaseModel


class RetrievedChunkResponse(AppBaseModel):
    """A single retrieved document chunk."""

    id: str
    content: str
    source: str
    title: str | None
    file_type: str | None
    chunk_index: int | None
    similarity: float | None = None


class DocumentSearchResponse(AppBaseModel):
    """Result payload for a plain (non-ranked) document search."""

    source: str
    chunk_count: int
    chunks: list[RetrievedChunkResponse]


class SemanticSearchResponse(AppBaseModel):
    """Result payload for a semantic (embedding-based) search."""

    query: str
    result_count: int
    results: list[RetrievedChunkResponse]


class RagQueryResponse(AppBaseModel):
    """Result payload for the RAG query endpoint.

    ``answer`` is intentionally absent — this endpoint performs retrieval
    only and does not call an LLM. ``context_chunks`` is the retrieved
    supporting material a future generation step would be grounded on.
    """

    question: str
    context_chunks: list[RetrievedChunkResponse]
