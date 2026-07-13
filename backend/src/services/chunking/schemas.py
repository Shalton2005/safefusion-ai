"""Data contracts for the text chunking service.

``Chunk`` is the service's output unit — one per split of a source
document's text. It mirrors the ``page_content`` + ``metadata`` shape
used throughout the ingestion pipeline (see
``src.services.document_ingestion.schemas.IngestedDocument``) so chunks
can be handed straight to an embedding step without another translation.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True, slots=True)
class Chunk:
    """A single split of a source document's text, tagged with its lineage.

    Attributes:
        content: The chunk's plain-text body.
        metadata: The source document's metadata, copied as-is, plus the
            chunk-specific fields ``chunk_index``, ``chunk_count``,
            ``start_offset``, and ``end_offset`` (offsets are into the
            *source* document's text, not this chunk's own content —
            they let a chunk be traced back to its origin, and combined
            with a source's ``pages`` offsets to resolve page numbers).
    """

    content: str
    metadata: Mapping[str, Any]
