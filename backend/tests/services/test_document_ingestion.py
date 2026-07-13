"""Tests for the document ingestion pipeline."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.services.document_ingestion.cleaning import clean_text
from src.services.document_ingestion.loaders import UnsupportedDocumentTypeError, load_source
from src.services.document_ingestion.pipeline import DocumentIngestionPipeline


class TestCleanText:
    def test_rejoins_hyphenated_linebreak(self) -> None:
        assert clean_text("indus-\ntrial") == "industrial"

    def test_collapses_repeated_spaces(self) -> None:
        assert clean_text("a    b\tc") == "a b c"

    def test_collapses_excess_blank_lines(self) -> None:
        assert clean_text("a\n\n\n\n\nb") == "a\n\nb"

    def test_strips_trailing_whitespace_per_line(self) -> None:
        assert clean_text("a   \nb") == "a\nb"

    def test_strips_control_characters(self) -> None:
        assert clean_text("a\x00b\x0cc") == "abc"

    def test_trims_leading_and_trailing_whitespace(self) -> None:
        assert clean_text("  \n a \n  ") == "a"

    def test_empty_input_returns_empty_string(self) -> None:
        assert clean_text("") == ""


class TestLoadSource:
    def test_raises_for_missing_file(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            load_source(tmp_path / "missing.txt")

    def test_raises_for_unsupported_extension(self, tmp_path: Path) -> None:
        unsupported = tmp_path / "notes.docx"
        unsupported.write_text("content")
        with pytest.raises(UnsupportedDocumentTypeError):
            load_source(unsupported)

    def test_loads_plain_text_file(self, tmp_path: Path) -> None:
        source = tmp_path / "notes.txt"
        source.write_text("hello world")
        documents = load_source(source)
        assert len(documents) == 1
        assert documents[0].page_content == "hello world"

    def test_loads_markdown_file(self, tmp_path: Path) -> None:
        source = tmp_path / "guideline.md"
        source.write_text("# Title\n\nBody text.")
        documents = load_source(source)
        assert len(documents) == 1
        assert "Body text." in documents[0].page_content


class TestDocumentIngestionPipeline:
    def test_ingest_file_cleans_and_tags_text_source(self, tmp_path: Path) -> None:
        source = tmp_path / "incident.txt"
        source.write_text("Gas   leak in  Zone-A.\n\n\n\nCrew evacu-\nated safely.")

        document = DocumentIngestionPipeline().ingest_file(source)

        assert document.page_content == "Gas leak in Zone-A.\n\nCrew evacuated safely."
        assert document.metadata.source == str(source)
        assert document.metadata.title == "incident"
        assert document.metadata.file_type == "text"
        assert document.metadata.page_count is None
        assert document.metadata.pages == ()

    def test_ingest_file_tags_markdown_source(self, tmp_path: Path) -> None:
        source = tmp_path / "policy.md"
        source.write_text("# Policy\n\nAll workers must comply.")

        document = DocumentIngestionPipeline().ingest_file(source)

        assert document.metadata.file_type == "markdown"
        assert "All workers must comply." in document.page_content

    def test_ingest_file_raises_for_missing_source(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            DocumentIngestionPipeline().ingest_file(tmp_path / "missing.txt")

    def test_ingest_directory_skips_unsupported_files_and_loads_rest(self, tmp_path: Path) -> None:
        (tmp_path / "a.txt").write_text("first document")
        (tmp_path / "b.md").write_text("# second\n\ndocument")
        (tmp_path / "ignored.docx").write_text("not a supported type")

        documents = DocumentIngestionPipeline().ingest_directory(tmp_path)

        sources = {Path(d.metadata.source).name for d in documents}
        assert sources == {"a.txt", "b.md"}

    def test_ingest_directory_skips_file_that_fails_to_load(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        (tmp_path / "good.txt").write_text("fine")
        (tmp_path / "bad.txt").write_text("also fine on disk")

        pipeline = DocumentIngestionPipeline()
        original_ingest_file = pipeline.ingest_file

        def flaky_ingest_file(path: Path):
            if path.name == "bad.txt":
                raise RuntimeError("simulated loader failure")
            return original_ingest_file(path)

        monkeypatch.setattr(pipeline, "ingest_file", flaky_ingest_file)

        documents = pipeline.ingest_directory(tmp_path)

        assert len(documents) == 1
        assert Path(documents[0].metadata.source).name == "good.txt"

    def test_ingest_directory_returns_empty_list_for_no_matches(self, tmp_path: Path) -> None:
        (tmp_path / "irrelevant.docx").write_text("not supported")
        assert DocumentIngestionPipeline().ingest_directory(tmp_path) == []
