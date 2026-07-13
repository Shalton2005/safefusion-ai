"""Provider-agnostic embedding service for SafeFusion AI.

Turns :class:`~src.services.chunking.schemas.Chunk` objects into
:class:`~src.services.embedding.schemas.EmbeddedChunk` objects, ready for
a pgvector writer. Depends only on :class:`~src.services.embedding.port.EmbeddingProviderPort` —
never on ``OllamaEmbeddingProvider`` or any other concrete provider — so
the embedding backend can be swapped (a different local model, a hosted
API) by constructing this service with a different provider instance.
Nothing here changes when that happens.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from src.services.embedding.port import EmbeddingProviderPort
from src.services.embedding.schemas import EmbeddedChunk
from src.utils.logger import get_logger


if TYPE_CHECKING:
    from src.services.chunking.schemas import Chunk


logger = get_logger(__name__)


class EmbeddingService:
    """Generates embeddings for text chunks using an injected provider.

    Args:
        provider: Any object satisfying :class:`EmbeddingProviderPort`
            (e.g. :class:`~src.services.embedding.ollama_provider.OllamaEmbeddingProvider`).
            Injected rather than constructed internally so tests can pass
            a fake and production code can pass whichever provider is
            configured, without this class knowing which one it is.
    """

    def __init__(self, provider: EmbeddingProviderPort) -> None:
        self._provider = provider

    @property
    def model_name(self) -> str:
        return self._provider.model_name

    def embed_chunk(self, chunk: "Chunk") -> EmbeddedChunk:
        """Embed a single chunk."""
        return self.embed_chunks([chunk])[0]

    def embed_chunks(self, chunks: list["Chunk"]) -> list[EmbeddedChunk]:
        """Embed a batch of chunks, preserving order and metadata.

        Empty ``chunks`` returns an empty list without calling the
        provider — batching zero inputs is a no-op, not an error.
        """
        if not chunks:
            return []

        vectors = self._provider.embed_texts([chunk.content for chunk in chunks])

        embedded = [
            EmbeddedChunk(
                content=chunk.content,
                metadata=chunk.metadata,
                embedding=vector,
                model_name=self._provider.model_name,
            )
            for chunk, vector in zip(chunks, vectors)
        ]

        logger.info(
            "Embedded chunks model=%s count=%d dimensions=%d",
            self._provider.model_name,
            len(embedded),
            self._provider.dimensions,
        )
        return embedded

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query string (e.g. a user's search query at retrieval time)."""
        return self._provider.embed_query(text)
