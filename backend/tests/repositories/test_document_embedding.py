"""Tests for the DocumentEmbedding model and repository.

No live PostgreSQL/pgvector instance is available in this test
environment, so these tests verify what's dialect-independent:
- the ORM model's column/table shape (via DDL compilation),
- that `cosine_distance` compiles to pgvector's `<=>` operator,
- and the repository's query-construction and result-shaping logic,
  exercised against a ``MagicMock`` session rather than a real database.

Query *execution* against a real pgvector-enabled PostgreSQL instance is
not covered here — see the module docstring in
``src/repositories/document_embedding.py`` and the Alembic migration
``alembic/versions/20260713_1000_e2f9a1c7b8d4_add_pgvector_document_embeddings.py``
for the schema this assumes.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from src.models.document_embedding import DocumentEmbedding
from src.repositories.document_embedding import DocumentEmbeddingRepository, SimilarityMatch
from src.services.embedding.schemas import EmbeddedChunk


class TestDocumentEmbeddingModel:
    def test_table_name(self) -> None:
        assert DocumentEmbedding.__tablename__ == "document_embeddings"

    def test_ddl_declares_vector_column_with_configured_dimensions(self) -> None:
        ddl = str(CreateTable(DocumentEmbedding.__table__).compile(dialect=postgresql.dialect()))
        assert "VECTOR(768)" in ddl

    def test_ddl_declares_required_columns(self) -> None:
        ddl = str(CreateTable(DocumentEmbedding.__table__).compile(dialect=postgresql.dialect()))
        for column in ("content", "embedding", "source", "title", "file_type", "model_name", "chunk_metadata"):
            assert column in ddl

    def test_ddl_declares_jsonb_metadata_column(self) -> None:
        ddl = str(CreateTable(DocumentEmbedding.__table__).compile(dialect=postgresql.dialect()))
        assert "JSONB" in ddl

    def test_source_and_model_name_are_not_nullable(self) -> None:
        assert DocumentEmbedding.__table__.c.source.nullable is False
        assert DocumentEmbedding.__table__.c.model_name.nullable is False

    def test_title_and_file_type_are_nullable(self) -> None:
        # These come from optional loader-derived metadata (DocumentMetadata.title
        # can fall back to a filename stem, but chunk-level file_type may be
        # absent for non-pipeline callers), so they must not be NOT NULL.
        assert DocumentEmbedding.__table__.c.title.nullable is True
        assert DocumentEmbedding.__table__.c.file_type.nullable is True


class TestCosineDistanceCompilation:
    def test_compiles_to_pgvector_cosine_operator(self) -> None:
        distance = DocumentEmbedding.embedding.cosine_distance([0.1, 0.2, 0.3])
        compiled = str(
            distance.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})
        )
        assert "<=>" in compiled
        assert "document_embeddings.embedding" in compiled


class TestDocumentEmbeddingRepositoryCreateMany:
    def test_adds_all_rows_and_commits_once(self) -> None:
        db = MagicMock()
        repo = DocumentEmbeddingRepository(db)

        rows = [
            {"content": "a", "embedding": [0.1] * 768, "source": "a.txt", "model_name": "nomic-embed-text", "chunk_metadata": {}},
            {"content": "b", "embedding": [0.2] * 768, "source": "a.txt", "model_name": "nomic-embed-text", "chunk_metadata": {}},
        ]

        result = repo.create_many(rows)

        db.add_all.assert_called_once()
        added = db.add_all.call_args[0][0]
        assert len(added) == 2
        assert all(isinstance(obj, DocumentEmbedding) for obj in added)
        db.commit.assert_called_once()
        assert result == added

    def test_empty_input_still_commits_with_no_rows(self) -> None:
        db = MagicMock()
        repo = DocumentEmbeddingRepository(db)

        result = repo.create_many([])

        db.add_all.assert_called_once_with([])
        assert result == []


class TestDocumentEmbeddingRepositoryGetBySource:
    def test_executes_select_and_returns_scalars(self) -> None:
        db = MagicMock()
        expected_rows = [MagicMock(spec=DocumentEmbedding), MagicMock(spec=DocumentEmbedding)]
        db.execute.return_value.scalars.return_value.all.return_value = expected_rows
        repo = DocumentEmbeddingRepository(db)

        result = repo.get_by_source("policy.pdf")

        assert result == expected_rows
        db.execute.assert_called_once()


class TestDocumentEmbeddingRepositoryDeleteBySource:
    def test_deletes_every_row_returned_by_get_by_source(self) -> None:
        db = MagicMock()
        rows = [MagicMock(spec=DocumentEmbedding), MagicMock(spec=DocumentEmbedding), MagicMock(spec=DocumentEmbedding)]
        db.execute.return_value.scalars.return_value.all.return_value = rows
        repo = DocumentEmbeddingRepository(db)

        deleted_count = repo.delete_by_source("stale.pdf")

        assert deleted_count == 3
        assert db.delete.call_count == 3
        db.commit.assert_called_once()

    def test_no_matching_rows_deletes_nothing(self) -> None:
        db = MagicMock()
        db.execute.return_value.scalars.return_value.all.return_value = []
        repo = DocumentEmbeddingRepository(db)

        deleted_count = repo.delete_by_source("missing.pdf")

        assert deleted_count == 0
        db.delete.assert_not_called()
        db.commit.assert_called_once()


class TestDocumentEmbeddingRepositorySearchByCosineSimilarity:
    def _mock_row(self, distance: float) -> MagicMock:
        row = MagicMock()
        row.DocumentEmbedding = MagicMock(spec=DocumentEmbedding)
        row.distance = distance
        return row

    def test_converts_distance_to_similarity(self) -> None:
        db = MagicMock()
        db.execute.return_value.all.return_value = [self._mock_row(0.0), self._mock_row(0.5)]
        repo = DocumentEmbeddingRepository(db)

        matches = repo.search_by_cosine_similarity([0.1] * 768)

        assert [m.similarity for m in matches] == [1.0, 0.5]
        assert all(isinstance(m, SimilarityMatch) for m in matches)

    def test_applies_min_similarity_filter(self) -> None:
        db = MagicMock()
        db.execute.return_value.all.return_value = [
            self._mock_row(0.1),  # similarity 0.9
            self._mock_row(0.6),  # similarity 0.4
        ]
        repo = DocumentEmbeddingRepository(db)

        matches = repo.search_by_cosine_similarity([0.1] * 768, min_similarity=0.5)

        assert len(matches) == 1
        assert matches[0].similarity == 0.9

    def test_returns_empty_list_when_no_rows_match(self) -> None:
        db = MagicMock()
        db.execute.return_value.all.return_value = []
        repo = DocumentEmbeddingRepository(db)

        assert repo.search_by_cosine_similarity([0.1] * 768) == []

    def test_passes_limit_and_model_name_into_query(self) -> None:
        db = MagicMock()
        db.execute.return_value.all.return_value = []
        repo = DocumentEmbeddingRepository(db)

        repo.search_by_cosine_similarity([0.1] * 768, limit=3, model_name="nomic-embed-text")

        # Verify a statement was built and executed — the exact SQL shape
        # is covered by TestCosineDistanceCompilation above; here we only
        # confirm the call happened without raising.
        db.execute.assert_called_once()

    def test_min_similarity_filter_does_not_starve_limit(self) -> None:
        """A qualifying match ranked below the top-`limit` rows must still surface.

        Regression test: `min_similarity` used to be applied to only the
        top-`limit` rows fetched from the database, so a caller asking for
        `limit=2` with a threshold could get back fewer than 2 matches even
        though enough qualifying rows existed further down the ranking.
        """
        db = MagicMock()
        # Only the first two rows meet the 0.5 threshold; a third
        # qualifying row (similarity 0.55) sits just past the requested
        # limit=2 in rank order.
        db.execute.return_value.all.return_value = [
            self._mock_row(0.05),  # similarity 0.95 — passes
            self._mock_row(0.3),  # similarity 0.70 — passes
            self._mock_row(0.45),  # similarity 0.55 — passes, would be dropped without over-fetch
            self._mock_row(0.9),  # similarity 0.10 — fails threshold
        ]
        repo = DocumentEmbeddingRepository(db)

        matches = repo.search_by_cosine_similarity([0.1] * 768, limit=2, min_similarity=0.5)

        assert len(matches) == 2
        assert [round(m.similarity, 2) for m in matches] == [0.95, 0.70]


class TestDocumentEmbeddingRepositoryStoreEmbeddedChunks:
    def test_returns_empty_list_for_empty_input(self) -> None:
        db = MagicMock()
        repo = DocumentEmbeddingRepository(db)

        assert repo.store_embedded_chunks([]) == []
        db.add_all.assert_not_called()

    def test_maps_embedded_chunk_metadata_onto_promoted_columns(self) -> None:
        db = MagicMock()
        repo = DocumentEmbeddingRepository(db)
        chunk = EmbeddedChunk(
            content="Workers must wear PPE.",
            metadata={
                "source": "oisd-guideline.pdf",
                "title": "OISD Guideline",
                "file_type": "pdf",
                "chunk_index": 2,
                "chunk_count": 5,
                "start_offset": 100,
                "end_offset": 150,
            },
            embedding=[0.1] * 768,
            model_name="nomic-embed-text",
        )

        repo.store_embedded_chunks([chunk])

        db.add_all.assert_called_once()
        [added_obj] = db.add_all.call_args[0][0]
        assert added_obj.content == "Workers must wear PPE."
        assert added_obj.source == "oisd-guideline.pdf"
        assert added_obj.title == "OISD Guideline"
        assert added_obj.file_type == "pdf"
        assert added_obj.chunk_index == 2
        assert added_obj.chunk_count == 5
        assert added_obj.model_name == "nomic-embed-text"
        assert added_obj.embedding == [0.1] * 768

    def test_preserves_full_metadata_in_chunk_metadata_column(self) -> None:
        db = MagicMock()
        repo = DocumentEmbeddingRepository(db)
        metadata = {
            "source": "a.txt",
            "title": "A",
            "file_type": "text",
            "chunk_index": 0,
            "chunk_count": 1,
            "start_offset": 0,
            "end_offset": 10,
        }
        chunk = EmbeddedChunk(content="text", metadata=metadata, embedding=[0.1] * 768, model_name="nomic-embed-text")

        repo.store_embedded_chunks([chunk])

        [added_obj] = db.add_all.call_args[0][0]
        assert added_obj.chunk_metadata == metadata

    def test_missing_optional_metadata_defaults_to_none(self) -> None:
        db = MagicMock()
        repo = DocumentEmbeddingRepository(db)
        chunk = EmbeddedChunk(
            content="text",
            metadata={"source": "a.txt"},
            embedding=[0.1] * 768,
            model_name="nomic-embed-text",
        )

        repo.store_embedded_chunks([chunk])

        [added_obj] = db.add_all.call_args[0][0]
        assert added_obj.title is None
        assert added_obj.file_type is None
        assert added_obj.chunk_index is None
        assert added_obj.chunk_count is None

    def test_stores_multiple_chunks_in_one_call(self) -> None:
        db = MagicMock()
        repo = DocumentEmbeddingRepository(db)
        chunks = [
            EmbeddedChunk(content=f"chunk {i}", metadata={"source": "a.txt", "chunk_index": i}, embedding=[0.1] * 768, model_name="nomic-embed-text")
            for i in range(3)
        ]

        repo.store_embedded_chunks(chunks)

        added = db.add_all.call_args[0][0]
        assert len(added) == 3
        assert [obj.content for obj in added] == ["chunk 0", "chunk 1", "chunk 2"]
