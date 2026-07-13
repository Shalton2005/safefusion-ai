"""Data contracts for the embedding service.

``EmbeddedChunk`` is the service's output unit — one per
:class:`~src.services.chunking.schemas.Chunk` embedded. It carries the
chunk's content and metadata through unchanged (for pgvector storage
alongside the vector, and for tracing a retrieved match back to its
source document) plus the vector itself and which model produced it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True, slots=True)
class EmbeddedChunk:
    """A text chunk paired with its vector embedding.

    Attributes:
        content: The chunk's plain-text body (unchanged from the source ``Chunk``).
        metadata: The chunk's metadata, copied as-is (source, title, chunk
            index/offsets — see ``src.services.chunking.schemas.Chunk``).
        embedding: The vector representation of ``content``.
        model_name: The embedding model that produced ``embedding`` — stored
            alongside the vector so a future model swap can be detected and
            re-embedded rather than silently mixing incompatible vector spaces.
    """

    content: str
    metadata: Mapping[str, Any]
    embedding: list[float]
    model_name: str
