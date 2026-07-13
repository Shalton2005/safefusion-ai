"""Configuration for the text chunking service."""

from __future__ import annotations

from dataclasses import dataclass, field


# LangChain's own default for RecursiveCharacterTextSplitter — kept explicit
# here so callers can see the actual value without reading the LangChain source.
_DEFAULT_SEPARATORS: tuple[str, ...] = ("\n\n", "\n", " ", "")


@dataclass(frozen=True, slots=True)
class ChunkingConfig:
    """Tunable parameters for :class:`~src.services.chunking.chunker.TextChunker`.

    Attributes:
        chunk_size: Maximum characters per chunk.
        chunk_overlap: Characters shared between consecutive chunks, so
            context near a split boundary isn't lost. Must be smaller
            than ``chunk_size``.
        separators: Ordered split points, tried from most to least
            preferred (paragraph, then line, then word, then character).
            Passed straight to ``RecursiveCharacterTextSplitter``.
        keep_separator: Whether the separator that produced a split stays
            attached to the chunk it split from (LangChain default: True).
    """

    chunk_size: int = 1000
    chunk_overlap: int = 200
    separators: tuple[str, ...] = field(default_factory=lambda: _DEFAULT_SEPARATORS)
    keep_separator: bool = True

    def __post_init__(self) -> None:
        if self.chunk_size <= 0:
            raise ValueError(f"chunk_size must be positive, got {self.chunk_size}")
        if self.chunk_overlap < 0:
            raise ValueError(f"chunk_overlap must be non-negative, got {self.chunk_overlap}")
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError(
                f"chunk_overlap ({self.chunk_overlap}) must be smaller than "
                f"chunk_size ({self.chunk_size})"
            )
