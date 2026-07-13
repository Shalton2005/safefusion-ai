"""
DocumentEmbedding ORM model for SafeFusion AI.

Maps to the ``document_embeddings`` table — pgvector-backed storage for
RAG document-chunk embeddings (OISD/Factory Act/DGMS regulatory documents
and incident reports, per ``docs/tech-stack.md``). Each row is one
embedded chunk produced by ``src.services.chunking`` and
``src.services.embedding``.

The ``embedding`` column width (``Vector(settings.EMBEDDING_DIMENSIONS)``)
is fixed at table-creation time by pgvector and must match whatever
embedding model wrote the vector. ``model_name`` is stored per row
specifically so a future embedding-model swap doesn't silently mix
incompatible vector spaces in the same column: query code can filter or
assert on it, and a model change that alters vector width requires an
Alembic migration to resize the column (see the initial migration for
this table) before any row using the new model can be inserted.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.config.settings import settings
from src.database.base import Base


class DocumentEmbedding(Base):
    """SQLAlchemy ORM model for a single embedded document chunk."""

    __tablename__ = "document_embeddings"

    __table_args__ = (
        Index("ix_document_embeddings_source", "source"),
        Index("ix_document_embeddings_model_name", "model_name"),
        # IVFFlat index for approximate cosine-distance search. `lists` is a
        # standard starting point (rule of thumb: rows / 1000, floor 1) — an
        # empty table at migration time makes IVFFlat's training step a
        # no-op, which is fine; PostgreSQL still uses the index correctly as
        # rows accumulate, though `REINDEX` after a large bulk load improves
        # recall/query-plan quality once real cluster centroids exist.
        Index(
            "ix_document_embeddings_embedding_cosine",
            "embedding",
            postgresql_using="ivfflat",
            postgresql_with={"lists": 100},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    # ── Content ───────────────────────────────────────────────────────────────
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="Chunk plain-text body")
    embedding: Mapped[list[float]] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSIONS),
        nullable=False,
        comment="Vector embedding of `content`",
    )

    # ── Source information ───────────────────────────────────────────────────
    source: Mapped[str] = mapped_column(
        String(1024), nullable=False, comment="Path/URI of the originating document"
    )
    title: Mapped[str | None] = mapped_column(String(512), nullable=True, comment="Source document title")
    file_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Normalized source format: pdf, markdown, text"
    )

    # ── Chunk lineage ─────────────────────────────────────────────────────────
    chunk_index: Mapped[int | None] = mapped_column(
        nullable=True, comment="0-based position of this chunk within its source document"
    )
    chunk_count: Mapped[int | None] = mapped_column(
        nullable=True, comment="Total number of chunks produced from the source document"
    )

    # ── Provenance / arbitrary metadata ──────────────────────────────────────
    # Full metadata mapping from the source Chunk (offsets, page numbers,
    # etc.) preserved as-is, in addition to the promoted columns above —
    # the promoted columns exist for indexed/filterable access; this column
    # is the lossless record.
    chunk_metadata: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, comment="Full chunk metadata, preserved as-is"
    )

    # ── Embedding provenance ─────────────────────────────────────────────────
    model_name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="Embedding model that produced `embedding`"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
