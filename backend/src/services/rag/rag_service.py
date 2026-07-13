"""RAG retrieval service for SafeFusion AI.

Composes :class:`~src.services.embedding.service.EmbeddingService` (query
embedding) and :class:`~src.repositories.document_embedding.DocumentEmbeddingRepository`
(pgvector storage/search) into the two retrieval operations the API
exposes: plain metadata-based document search, and embedding-based
semantic search. Both return the same :class:`~src.services.rag.schemas.RetrievedChunk`
shape so callers don't need to special-case which lookup produced a result.

No LLM call happens anywhere in this module. Semantic search and the
query endpoint both stop at "here are the most relevant chunks" — turning
that into a generated answer is a deliberately separate, not-yet-built
step (see the module docstring in ``src/routes/rag.py``).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

from src.repositories.document_embedding import DocumentEmbeddingRepository, SimilarityMatch
from src.services.rag.schemas import RetrievedChunk
from src.utils.logger import get_logger


if TYPE_CHECKING:
    from src.models.document_embedding import DocumentEmbedding


logger = get_logger(__name__)


class QueryEmbedderPort(Protocol):
    """Contract for turning a query string into a vector.

    Satisfied by :class:`~src.services.embedding.service.EmbeddingService`.
    Declared as a narrow Protocol (rather than depending on
    ``EmbeddingService`` directly) so this service only commits to the one
    method it actually needs, keeping it testable against a fake with no
    embedding-package dependency.
    """

    def embed_query(self, text: str) -> list[float]: ...


class RagService:
    """Read-only retrieval operations over the ``document_embeddings`` table.

    Args:
        repository: pgvector-backed data access for stored chunks.
        embedder: Turns a query string into a vector for semantic search.
    """

    def __init__(self, repository: DocumentEmbeddingRepository, embedder: QueryEmbedderPort) -> None:
        self._repository = repository
        self._embedder = embedder

    def search_documents(self, *, source: str) -> list[RetrievedChunk]:
        """Return every stored chunk for a given source document, in chunk order.

        Plain metadata lookup — no embedding model is invoked. Useful for
        "show me everything ingested from this file" without needing a
        query to rank against.
        """
        rows = self._repository.get_by_source(source)
        return [_to_retrieved_chunk(row) for row in rows]

    def semantic_search(
        self,
        *,
        query: str,
        limit: int = 5,
        min_similarity: float | None = None,
    ) -> list[RetrievedChunk]:
        """Embed ``query`` and return the most similar stored chunks, ranked by cosine similarity.

        Args:
            query: Free-text search string.
            limit: Maximum number of chunks to return.
            min_similarity: If given, drop matches below this cosine
                similarity threshold.

        Returns:
            Chunks ordered by descending similarity (most relevant first).
            Empty list if ``query`` is blank or nothing meets the threshold.
        """
        if not query or not query.strip():
            return []

        query_vector = self._embedder.embed_query(query)
        matches = self._repository.search_by_cosine_similarity(
            query_vector,
            limit=limit,
            min_similarity=min_similarity,
        )

        logger.info("Semantic search query_length=%d matches=%d", len(query), len(matches))
        return [_to_retrieved_chunk(match) for match in matches]

    def query(
        self,
        *,
        question: str,
        limit: int = 5,
        min_similarity: float | None = None,
    ) -> list[RetrievedChunk]:
        """Retrieve the chunks most relevant to a natural-language question.

        Currently identical to :meth:`semantic_search` — this method exists
        as its own seam because a future answer-generation step (LLM call
        over the retrieved chunks) belongs here, not inside
        :meth:`semantic_search`, which callers may still want as a pure
        retrieval primitive once generation is added.
        """
        return self.semantic_search(query=question, limit=limit, min_similarity=min_similarity)


def _to_retrieved_chunk(row: "DocumentEmbedding | SimilarityMatch") -> RetrievedChunk:
    """Build a :class:`RetrievedChunk` from either a bare ORM row or a :class:`SimilarityMatch`."""
    if isinstance(row, SimilarityMatch):
        embedding, similarity = row.embedding, row.similarity
    else:
        embedding, similarity = row, None

    return RetrievedChunk(
        id=str(embedding.id),
        content=embedding.content,
        source=embedding.source,
        title=embedding.title,
        file_type=embedding.file_type,
        chunk_index=embedding.chunk_index,
        similarity=similarity,
    )
