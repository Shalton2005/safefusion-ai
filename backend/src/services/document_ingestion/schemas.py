"""Data contracts for the document ingestion pipeline.

``IngestedDocument`` is the pipeline's output unit — one per source file
(a multi-page PDF is merged into a single document; see ``pipeline.py``).
It intentionally mirrors the shape LangChain's text splitters expect
(``page_content`` + ``metadata``) so chunking can consume it directly
without another translation step.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True, slots=True)
class IngestedDocument:
    """A single cleaned source document, ready for chunking.

    Attributes:
        page_content: Cleaned, plain-text body of the document.
        metadata: Provenance fields preserved from the source file —
            always includes ``source`` and ``title``; ``page_count`` and
            ``pages`` are populated for paginated formats (PDF).
    """

    page_content: str
    metadata: "DocumentMetadata"


@dataclass(frozen=True, slots=True)
class DocumentMetadata:
    """Provenance metadata carried alongside a document's text.

    Attributes:
        source: Absolute or repo-relative path to the originating file.
        title: Human-readable title — the filename stem unless a loader
            extracts a better one (e.g. a PDF's document info dictionary).
        file_type: Normalized source format: ``"pdf"``, ``"markdown"``, or ``"text"``.
        page_count: Total pages in the source document, if paginated (PDF only).
        pages: Per-page character offsets into ``page_content``, as
            ``(page_number, start_offset, end_offset)`` triples — lets a
            downstream chunker recover which page a chunk came from.
    """

    source: str
    title: str
    file_type: str
    page_count: int | None = None
    pages: tuple[tuple[int, int, int], ...] = field(default_factory=tuple)

    @classmethod
    def for_source(cls, path: Path, file_type: str, title: str | None = None) -> "DocumentMetadata":
        return cls(
            source=str(path),
            title=title or path.stem,
            file_type=file_type,
        )
