"""Tests for the text chunking service."""

from __future__ import annotations

import pytest

from src.services.chunking.chunker import TextChunker
from src.services.chunking.config import ChunkingConfig
from src.services.document_ingestion.schemas import DocumentMetadata, IngestedDocument


class TestChunkingConfig:
    def test_defaults_are_valid(self) -> None:
        config = ChunkingConfig()
        assert config.chunk_size == 1000
        assert config.chunk_overlap == 200

    def test_rejects_non_positive_chunk_size(self) -> None:
        with pytest.raises(ValueError, match="chunk_size"):
            ChunkingConfig(chunk_size=0)

    def test_rejects_negative_overlap(self) -> None:
        with pytest.raises(ValueError, match="chunk_overlap"):
            ChunkingConfig(chunk_size=100, chunk_overlap=-1)

    def test_rejects_overlap_not_smaller_than_chunk_size(self) -> None:
        with pytest.raises(ValueError, match="chunk_overlap"):
            ChunkingConfig(chunk_size=100, chunk_overlap=100)


class TestTextChunkerChunkText:
    def test_returns_empty_list_for_empty_text(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=50, chunk_overlap=10))
        assert chunker.chunk_text("") == []

    def test_returns_empty_list_for_whitespace_only_text(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=50, chunk_overlap=10))
        assert chunker.chunk_text("   \n\n  ") == []

    def test_short_text_produces_single_chunk(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=1000, chunk_overlap=200))
        chunks = chunker.chunk_text("A short sentence.")
        assert len(chunks) == 1
        assert chunks[0].content == "A short sentence."
        assert chunks[0].metadata["chunk_index"] == 0
        assert chunks[0].metadata["chunk_count"] == 1

    def test_long_text_splits_into_multiple_chunks(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=50, chunk_overlap=10))
        text = "Paragraph one is here.\n\n" + ("Word " * 40) + "\n\nFinal paragraph."
        chunks = chunker.chunk_text(text)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk.content) <= 50

    def test_respects_configured_chunk_size(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=20, chunk_overlap=5))
        text = "word " * 50
        chunks = chunker.chunk_text(text)
        assert all(len(chunk.content) <= 20 for chunk in chunks)

    def test_consecutive_chunks_overlap(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=30, chunk_overlap=10))
        text = "one two three four five six seven eight nine ten eleven twelve"
        chunks = chunker.chunk_text(text)
        assert len(chunks) > 1
        # At least one word from the tail of a chunk should reappear at the
        # head of the next chunk, confirming overlap actually happened.
        first_tail_words = set(chunks[0].content.split()[-2:])
        second_head_words = set(chunks[1].content.split()[:2])
        assert first_tail_words & second_head_words

    def test_preserves_caller_supplied_metadata_on_every_chunk(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=20, chunk_overlap=5))
        text = "word " * 20
        metadata = {"source": "policy.pdf", "title": "Policy", "custom": 42}
        chunks = chunker.chunk_text(text, metadata)
        assert len(chunks) > 1
        for chunk in chunks:
            assert chunk.metadata["source"] == "policy.pdf"
            assert chunk.metadata["title"] == "Policy"
            assert chunk.metadata["custom"] == 42

    def test_does_not_mutate_caller_supplied_metadata(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=1000, chunk_overlap=200))
        metadata = {"source": "a.txt"}
        chunker.chunk_text("hello world", metadata)
        assert metadata == {"source": "a.txt"}

    def test_chunk_index_and_count_are_consistent(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=15, chunk_overlap=3))
        text = "alpha beta gamma delta epsilon zeta eta theta"
        chunks = chunker.chunk_text(text)
        assert [c.metadata["chunk_index"] for c in chunks] == list(range(len(chunks)))
        assert all(c.metadata["chunk_count"] == len(chunks) for c in chunks)

    def test_offsets_locate_chunk_within_source_text(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=1000, chunk_overlap=200))
        text = "  hello world  "
        chunks = chunker.chunk_text(text)
        chunk = chunks[0]
        start = chunk.metadata["start_offset"]
        end = chunk.metadata["end_offset"]
        assert text[start:end] == chunk.content

    def test_none_metadata_defaults_to_empty_base(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=1000, chunk_overlap=200))
        chunks = chunker.chunk_text("hello", None)
        assert chunks[0].metadata["chunk_index"] == 0


class TestTextChunkerReuse:
    def test_same_instance_reused_across_multiple_texts(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=1000, chunk_overlap=200))
        first = chunker.chunk_text("first document text")
        second = chunker.chunk_text("second, unrelated document text")
        assert first[0].content == "first document text"
        assert second[0].content == "second, unrelated document text"

    def test_config_property_reflects_constructor_argument(self) -> None:
        config = ChunkingConfig(chunk_size=333, chunk_overlap=33)
        chunker = TextChunker(config)
        assert chunker.config.chunk_size == 333
        assert chunker.config.chunk_overlap == 33

    def test_default_config_used_when_none_provided(self) -> None:
        chunker = TextChunker()
        assert chunker.config.chunk_size == 1000
        assert chunker.config.chunk_overlap == 200


class TestTextChunkerChunkDocument:
    def _document(self) -> IngestedDocument:
        metadata = DocumentMetadata(source="policy.pdf", title="Policy", file_type="pdf", page_count=2)
        return IngestedDocument(page_content="word " * 30, metadata=metadata)

    def test_chunk_document_attaches_source_metadata(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=30, chunk_overlap=5))
        chunks = chunker.chunk_document(self._document())
        assert len(chunks) > 1
        for chunk in chunks:
            assert chunk.metadata["source"] == "policy.pdf"
            assert chunk.metadata["title"] == "Policy"
            assert chunk.metadata["file_type"] == "pdf"

    def test_chunk_documents_flattens_across_multiple_sources(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=1000, chunk_overlap=200))
        doc_a = IngestedDocument(
            page_content="doc a content",
            metadata=DocumentMetadata(source="a.txt", title="A", file_type="text"),
        )
        doc_b = IngestedDocument(
            page_content="doc b content",
            metadata=DocumentMetadata(source="b.txt", title="B", file_type="text"),
        )
        chunks = chunker.chunk_documents([doc_a, doc_b])
        assert len(chunks) == 2
        assert chunks[0].metadata["source"] == "a.txt"
        assert chunks[1].metadata["source"] == "b.txt"

    def test_chunk_documents_returns_empty_list_for_empty_input(self) -> None:
        chunker = TextChunker(ChunkingConfig(chunk_size=1000, chunk_overlap=200))
        assert chunker.chunk_documents([]) == []
