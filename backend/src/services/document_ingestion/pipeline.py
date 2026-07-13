"""Document ingestion pipeline for SafeFusion AI.

Turns source files (PDF, Markdown, TXT — e.g. OISD/Factory Act/DGMS
regulatory documents and incident reports, per ``docs/tech-stack.md``)
into cleaned, metadata-tagged :class:`~src.services.document_ingestion.schemas.IngestedDocument`
objects ready for a text splitter.

Each stage is independently swappable:
    - ``loaders.py`` — format -> LangChain loader
    - ``cleaning.py`` — raw text -> normalized text
    - this module — orchestration, page merging, metadata assembly

This module stops at "ready for chunking" by design — it does not split
text or generate embeddings. That keeps it a single-responsibility seam
that a future ``chunking.py`` (text splitter) and ``embedding.py``
(pgvector writer) can sit downstream of without this module changing.
"""

from __future__ import annotations

from pathlib import Path

from langchain_core.documents import Document

from src.services.document_ingestion.cleaning import clean_text
from src.services.document_ingestion.loaders import load_source, supported_suffixes
from src.services.document_ingestion.schemas import DocumentMetadata, IngestedDocument
from src.utils.logger import get_logger


logger = get_logger(__name__)


class DocumentIngestionPipeline:
    """Loads, cleans, and tags source documents for downstream chunking."""

    def ingest_file(self, path: Path) -> IngestedDocument:
        """Ingest a single source file into one cleaned :class:`IngestedDocument`.

        Multi-page sources (PDF) are merged into one document: pages are
        cleaned individually (so page-boundary artifacts don't bleed
        across the merge), then joined with a blank-line separator that
        the ``pages`` metadata offsets are computed against.
        """
        raw_documents = load_source(path)
        if not raw_documents:
            raise ValueError(f"Loader returned no content for {path}")

        file_type = _file_type_for_suffix(path.suffix.lower())
        title = _extract_title(raw_documents, fallback=path.stem)

        cleaned_pages = [clean_text(doc.page_content) for doc in raw_documents]

        merged_text_parts: list[str] = []
        page_offsets: list[tuple[int, int, int]] = []
        cursor = 0
        for page_number, page_text in enumerate(cleaned_pages, start=1):
            start = cursor
            merged_text_parts.append(page_text)
            cursor += len(page_text)
            page_offsets.append((page_number, start, cursor))
            cursor += 2  # account for the "\n\n" joiner inserted below

        merged_text = "\n\n".join(merged_text_parts)

        metadata = DocumentMetadata(
            source=str(path),
            title=title,
            file_type=file_type,
            page_count=len(raw_documents) if file_type == "pdf" else None,
            pages=tuple(page_offsets) if file_type == "pdf" else (),
        )

        logger.info(
            "Ingested document source=%s file_type=%s pages=%s characters=%d",
            path,
            file_type,
            metadata.page_count,
            len(merged_text),
        )
        return IngestedDocument(page_content=merged_text, metadata=metadata)

    def ingest_directory(self, directory: Path, *, recursive: bool = True) -> list[IngestedDocument]:
        """Ingest every supported file under ``directory``.

        Files with an unsupported extension are skipped (not errored) so
        a mixed directory of source material and unrelated files can be
        pointed at directly. Each supported file that fails to load logs
        a warning and is skipped, so one bad file doesn't abort the batch.
        """
        pattern = "**/*" if recursive else "*"
        suffixes = set(supported_suffixes())

        documents: list[IngestedDocument] = []
        for candidate in sorted(directory.glob(pattern)):
            if not candidate.is_file() or candidate.suffix.lower() not in suffixes:
                continue
            try:
                documents.append(self.ingest_file(candidate))
            except Exception:
                logger.warning("Skipping document that failed to ingest source=%s", candidate, exc_info=True)

        logger.info("Directory ingestion complete directory=%s documents=%d", directory, len(documents))
        return documents


def _file_type_for_suffix(suffix: str) -> str:
    if suffix == ".pdf":
        return "pdf"
    if suffix in (".md", ".markdown"):
        return "markdown"
    return "text"


def _extract_title(raw_documents: list[Document], fallback: str) -> str:
    """Prefer a loader-supplied title (e.g. PDF document info); else use the filename stem."""
    for doc in raw_documents:
        title = doc.metadata.get("title")
        if title:
            return str(title).strip()
    return fallback
