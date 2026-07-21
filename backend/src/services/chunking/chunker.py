"""Reusable text chunking service for SafeFusion AI.

Wraps LangChain's ``RecursiveCharacterTextSplitter`` behind a small,
dependency-light interface: configurable chunk size/overlap (see
``config.py``), metadata preserved on every chunk plus split-specific
provenance fields, and a plain :class:`~src.services.chunking.schemas.Chunk`
return type decoupled from any one LangChain version's ``Document`` shape.

Deliberately generic — ``chunk_text`` takes a bare string and metadata
mapping, so this service works for any text source, not just
:class:`~src.services.document_ingestion.schemas.IngestedDocument`.
``chunk_document`` is a thin convenience wrapper for that specific type.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Mapping

from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.services.chunking.config import ChunkingConfig
from src.services.chunking.schemas import Chunk
from src.utils.logger import get_logger


if TYPE_CHECKING:
    from src.services.document_ingestion.schemas import IngestedDocument


logger = get_logger(__name__)


class TextChunker:
    """Splits text into overlapping chunks with LangChain's recursive splitter.

    One instance is bound to one :class:`ChunkingConfig` and can be reused
    across any number of documents — construct it once (e.g. per pipeline
    run, or as a shared singleton) rather than per call.

    Args:
        config: Chunk size/overlap/separator settings. Defaults to
            ``ChunkingConfig()`` (1000 chars, 200 overlap).
    """

    def __init__(self, config: ChunkingConfig | None = None) -> None:
        self._config = config or ChunkingConfig()
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=self._config.chunk_size,
            chunk_overlap=self._config.chunk_overlap,
            separators=list(self._config.separators),
            keep_separator=self._config.keep_separator,
        )

    @property
    def config(self) -> ChunkingConfig:
        return self._config

    def chunk_text(self, text: str, metadata: Mapping[str, Any] | None = None) -> list[Chunk]:
        """Split ``text`` into structured, metadata-tagged :class:`Chunk` objects.

        ``metadata`` is copied onto every resulting chunk unchanged, plus
        four chunk-specific fields: ``chunk_index`` (0-based),
        ``chunk_count`` (total chunks for this text), and ``start_offset``/
        ``end_offset`` (this chunk's span within ``text``, found via a
        forward-scanning substring search so overlap/re-occurring text
        doesn't confuse offset tracking).

        Returns an empty list for empty or whitespace-only input.
        """
        base_metadata = dict(metadata or {})

        if not text or not text.strip():
            return []

        pieces = self._splitter.split_text(text)
        if not pieces:
            return []

        chunks: list[Chunk] = []
        search_from = 0
        for index, piece in enumerate(pieces):
            start_offset = text.find(piece, search_from)
            if start_offset == -1:
                # Splitter normalized whitespace in a way that broke an exact
                # substring match (rare, but possible with custom separators).
                # Fall back to search-from-start rather than raising, since
                # the offsets are auxiliary metadata, not required for the
                # chunk content itself to be correct.
                start_offset = text.find(piece)
            end_offset = start_offset + len(piece) if start_offset != -1 else len(piece)
            search_from = end_offset

            chunk_metadata = {
                **base_metadata,
                "chunk_index": index,
                "chunk_count": len(pieces),
                "start_offset": start_offset if start_offset != -1 else None,
                "end_offset": end_offset,
            }
            chunks.append(Chunk(content=piece, metadata=chunk_metadata))

        logger.info(
            "Chunked text characters=%d chunks=%d chunk_size=%d chunk_overlap=%d",
            len(text),
            len(chunks),
            self._config.chunk_size,
            self._config.chunk_overlap,
        )
        return chunks

    def chunk_document(self, document: "IngestedDocument") -> list[Chunk]:
        """Convenience wrapper: chunk an :class:`IngestedDocument`'s text with its metadata attached.

        Additionally resolves a ``page`` number for each chunk (1-based,
        the page its ``start_offset`` falls within) from the document's
        ``metadata.pages`` offset table — populated for paginated sources
        (PDF) only; ``None`` for markdown/text sources or if a chunk's
        offset couldn't be resolved (e.g. the substring-search fallback
        in :meth:`chunk_text` failed to locate it). This is what lets a
        retrieved chunk cite "Document.pdf, Page 12" instead of just the
        source file.
        """
        from dataclasses import asdict

        chunks = self.chunk_text(document.page_content, asdict(document.metadata))
        if not document.metadata.pages:
            return chunks

        return [
            Chunk(content=chunk.content, metadata={**chunk.metadata, "page": _resolve_page(chunk, document)})
            for chunk in chunks
        ]

    def chunk_documents(self, documents: list["IngestedDocument"]) -> list[Chunk]:
        """Chunk multiple documents, returning one flat list of chunks."""
        result: list[Chunk] = []
        for document in documents:
            result.extend(self.chunk_document(document))
        return result


def _resolve_page(chunk: Chunk, document: "IngestedDocument") -> int | None:
    """Find the 1-based page number containing a chunk's start offset.

    ``document.metadata.pages`` is an ordered list of
    ``(page_number, start_offset, end_offset)`` triples (see
    ``DocumentMetadata``) — a linear scan is fine here since a source
    document has at most a few hundred pages and this runs once per
    chunk at ingestion time, not on the retrieval hot path.
    """
    start_offset = chunk.metadata.get("start_offset")
    if start_offset is None:
        return None
    for page_number, page_start, page_end in document.metadata.pages:
        if page_start <= start_offset < page_end:
            return page_number
    # A chunk starting exactly at (or past) the last page's end offset —
    # e.g. the final chunk ending flush with the document — falls back to
    # the last known page rather than None.
    return document.metadata.pages[-1][0] if document.metadata.pages else None
