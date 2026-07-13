"""Add pgvector extension and document_embeddings table for RAG.

Revision ID: e2f9a1c7b8d4
Revises: b19f2d7c3e41
Create Date: 2026-07-13 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "e2f9a1c7b8d4"
down_revision: Union[str, None] = "b19f2d7c3e41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Must match settings.EMBEDDING_DIMENSIONS (nomic-embed-text's output
# width). A future embedding-model swap to a model with a different
# vector width requires a new migration that drops and recreates this
# column at the new dimensionality — pgvector's Vector type is fixed-width,
# it cannot be widened/narrowed in place, and existing rows would need
# re-embedding regardless since the vector *space* itself changes.
_EMBEDDING_DIMENSIONS = 768


def upgrade() -> None:
    """Enable pgvector and create document_embeddings."""
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "document_embeddings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, comment="Chunk plain-text body"),
        sa.Column(
            "embedding",
            Vector(_EMBEDDING_DIMENSIONS),
            nullable=False,
            comment="Vector embedding of `content`",
        ),
        sa.Column(
            "source",
            sa.String(length=1024),
            nullable=False,
            comment="Path/URI of the originating document",
        ),
        sa.Column("title", sa.String(length=512), nullable=True, comment="Source document title"),
        sa.Column(
            "file_type",
            sa.String(length=50),
            nullable=True,
            comment="Normalized source format: pdf, markdown, text",
        ),
        sa.Column(
            "chunk_index",
            sa.Integer(),
            nullable=True,
            comment="0-based position of this chunk within its source document",
        ),
        sa.Column(
            "chunk_count",
            sa.Integer(),
            nullable=True,
            comment="Total number of chunks produced from the source document",
        ),
        sa.Column(
            "chunk_metadata",
            JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
            comment="Full chunk metadata, preserved as-is",
        ),
        sa.Column(
            "model_name",
            sa.String(length=255),
            nullable=False,
            comment="Embedding model that produced `embedding`",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_document_embeddings_source", "document_embeddings", ["source"], unique=False)
    op.create_index(
        "ix_document_embeddings_model_name", "document_embeddings", ["model_name"], unique=False
    )
    op.execute(
        """
        CREATE INDEX ix_document_embeddings_embedding_cosine
        ON document_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )


def downgrade() -> None:
    """Drop document_embeddings and the pgvector extension."""
    op.drop_index("ix_document_embeddings_embedding_cosine", table_name="document_embeddings")
    op.drop_index("ix_document_embeddings_model_name", table_name="document_embeddings")
    op.drop_index("ix_document_embeddings_source", table_name="document_embeddings")
    op.drop_table("document_embeddings")
    # Extension is left in place intentionally: other objects/sessions may
    # depend on it, and CREATE EXTENSION IF NOT EXISTS in upgrade() makes
    # re-running upgrade safe regardless of whether it's still installed.
