"""Data contracts for the RAG retrieval service.

Distinct from :class:`~src.services.embedding.schemas.EmbeddedChunk` and
:class:`~src.repositories.document_embedding.SimilarityMatch`: those are
internal pipeline/data-access types (they carry the raw vector).
``RetrievedChunk`` is the retrieval-facing result — no vector, no
mutable ``Mapping`` metadata, just what a caller (a route, and later an
LLM prompt-assembly step) needs to consume a match.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RetrievedChunk:
    """One retrieved document chunk, ranked by relevance.

    Attributes:
        id: Primary key of the underlying ``document_embeddings`` row.
        content: The chunk's plain-text body.
        source: Path/URI of the originating document.
        title: Source document title, if known.
        file_type: Normalized source format (``pdf``, ``markdown``, ``text``), if known.
        chunk_index: 0-based position of this chunk within its source document, if known.
        page: 1-based source page number this chunk's text starts on, if
            known (paginated formats — PDF — only; ``None`` for
            markdown/text sources). Read out of the underlying row's
            ``chunk_metadata["page"]`` — see
            ``src.services.chunking.chunker.TextChunker.chunk_document``,
            which is what actually resolves it at ingestion time.
        similarity: Cosine similarity to the query, in ``[-1, 1]``. ``None``
            for lookups that don't rank by similarity (plain document search).
    """

    id: str
    content: str
    source: str
    title: str | None
    file_type: str | None
    chunk_index: int | None
    page: int | None
    similarity: float | None
