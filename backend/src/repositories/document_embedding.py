"""
DocumentEmbedding repository for SafeFusion AI.

Data-access layer for the pgvector-backed ``document_embeddings`` table.
Similarity search uses pgvector's ``<=>`` cosine-distance operator,
exposed by the ``pgvector`` SQLAlchemy integration as
:meth:`~pgvector.sqlalchemy.Vector.comparator_factory.cosine_distance`.
Cosine *distance* (0 = identical, 2 = opposite) is what pgvector computes
directly against the ``vector_cosine_ops`` index defined on the model;
this repository converts it to cosine *similarity* (``1 - distance``,
1 = identical) before returning results, since similarity is the more
intuitive ranking metric for callers (retrieval code, relevance
thresholds) to reason about.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.document_embedding import DocumentEmbedding
from src.repositories.base import BaseRepository


if TYPE_CHECKING:
    from src.services.embedding.schemas import EmbeddedChunk


@dataclass(frozen=True, slots=True)
class SimilarityMatch:
    """One result row from a cosine similarity search.

    Attributes:
        embedding: The matched :class:`DocumentEmbedding` row.
        similarity: Cosine similarity to the query vector, in ``[-1, 1]``
            (in practice ``[0, 1]`` for typical text embedding models,
            since their vectors are non-negative in aggregate). Higher is
            more similar; ``1.0`` is an exact match.
    """

    embedding: DocumentEmbedding
    similarity: float


class DocumentEmbeddingRepository(BaseRepository[DocumentEmbedding]):
    """Data-access layer for the DocumentEmbedding aggregate."""

    def __init__(self, db: Session) -> None:
        super().__init__(DocumentEmbedding, db)

    # ── Write ─────────────────────────────────────────────────────────────────

    def create_many(self, rows: list[dict]) -> list[DocumentEmbedding]:
        """Bulk-insert embedded chunks in a single transaction.

        Args:
            rows: Field-value mappings, one per row (same shape as
                :meth:`~src.repositories.base.BaseRepository.create`'s
                ``data`` argument).

        Returns:
            The newly created, refreshed ORM instances, in input order.
        """
        objects = [DocumentEmbedding(**row) for row in rows]
        self._db.add_all(objects)
        self._db.commit()
        for obj in objects:
            self._db.refresh(obj)
        return objects

    def store_embedded_chunks(self, embedded_chunks: list["EmbeddedChunk"]) -> list[DocumentEmbedding]:
        """Persist :class:`~src.services.embedding.schemas.EmbeddedChunk` objects as rows.

        Maps each chunk's metadata onto the model's promoted columns
        (``source``, ``title``, ``file_type``, ``chunk_index``,
        ``chunk_count``) when present, and always stores the full
        metadata mapping unchanged in ``chunk_metadata`` regardless of
        which promoted columns were populated — this is the seam between
        the embedding service's output and this table, kept in the
        repository layer rather than the service layer so
        ``EmbeddingService`` stays unaware of how (or whether) its output
        is ever persisted.

        Args:
            embedded_chunks: Output of
                :meth:`~src.services.embedding.service.EmbeddingService.embed_chunks`.

        Returns:
            The newly created, refreshed ORM instances, in input order.
            Empty input returns an empty list without touching the database.
        """
        if not embedded_chunks:
            return []

        rows = [
            {
                "content": chunk.content,
                "embedding": chunk.embedding,
                "source": chunk.metadata.get("source", ""),
                "title": chunk.metadata.get("title"),
                "file_type": chunk.metadata.get("file_type"),
                "chunk_index": chunk.metadata.get("chunk_index"),
                "chunk_count": chunk.metadata.get("chunk_count"),
                "chunk_metadata": dict(chunk.metadata),
                "model_name": chunk.model_name,
            }
            for chunk in embedded_chunks
        ]
        return self.create_many(rows)

    # ── Read ─────────────────────────────────────────────────────────────────

    def get_by_source(self, source: str) -> list[DocumentEmbedding]:
        """Return every chunk embedded from the given source document, in chunk order."""
        return list(
            self._db.execute(
                select(DocumentEmbedding)
                .where(DocumentEmbedding.source == source)
                .order_by(DocumentEmbedding.chunk_index)
            ).scalars().all()
        )

    def delete_by_source(self, source: str) -> int:
        """Delete every chunk embedded from the given source document.

        Intended for re-ingestion: call before re-embedding a source file
        so a re-run doesn't accumulate duplicate chunks alongside stale ones.

        Returns:
            The number of rows deleted.
        """
        rows = self.get_by_source(source)
        for row in rows:
            self._db.delete(row)
        self._db.commit()
        return len(rows)

    # ── Cosine similarity search ─────────────────────────────────────────────

    def search_by_cosine_similarity(
        self,
        query_embedding: list[float],
        *,
        limit: int = 5,
        model_name: str | None = None,
        min_similarity: float | None = None,
    ) -> list[SimilarityMatch]:
        """Return the ``limit`` chunks most similar to ``query_embedding`` by cosine similarity.

        Args:
            query_embedding: The query vector — must have the same
                dimensionality as the stored embeddings
                (``settings.EMBEDDING_DIMENSIONS``).
            limit: Maximum number of matches to return.
            model_name: If given, restrict the search to rows embedded by
                this model. Comparing vectors from different embedding
                models is meaningless (different vector spaces entirely),
                so pass this whenever the caller knows which model
                produced ``query_embedding`` — which should be always,
                once more than one model has ever been used.
            min_similarity: If given, drop matches below this cosine
                similarity threshold (post-query filter, since pgvector's
                ORDER BY/LIMIT already ranks by distance).

        Returns:
            Matches ordered by descending similarity (most similar first).
        """
        distance = DocumentEmbedding.embedding.cosine_distance(query_embedding)

        statement = select(DocumentEmbedding, distance.label("distance"))
        if model_name is not None:
            statement = statement.where(DocumentEmbedding.model_name == model_name)
        statement = statement.order_by(distance).limit(limit)

        rows = self._db.execute(statement).all()

        matches = [
            SimilarityMatch(embedding=row.DocumentEmbedding, similarity=1.0 - row.distance)
            for row in rows
        ]
        if min_similarity is not None:
            matches = [match for match in matches if match.similarity >= min_similarity]
        return matches
