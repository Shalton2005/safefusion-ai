"""Provider seam for the embedding service.

``EmbeddingProviderPort`` is the contract every embedding backend
implements. The service layer (``service.py``) depends only on this
Protocol, never on a concrete provider class — swapping the embedding
model or provider (Ollama's ``nomic-embed-text`` today; a hosted API, a
different local model, or pgvector-side embedding later) means adding a
new class that satisfies this Protocol and changing how it's wired in at
the call site. No change to ``EmbeddingService`` or its callers.

Same pattern as ``src.services.compliance.knowledge_source.ComplianceKnowledgeSourcePort``
and the repository ports in ``src.services.graph_ingestion``.
"""

from __future__ import annotations

from typing import Protocol


class EmbeddingProviderPort(Protocol):
    """Contract for turning text into vector embeddings.

    Implementations must be deterministic for a given model/text pair
    (same input -> same vector) and must raise rather than silently
    returning an empty or zero vector on failure, so callers can
    distinguish "no embedding" from "embedding of empty text".
    """

    @property
    def model_name(self) -> str:
        """The identifier of the embedding model in use (e.g. ``"nomic-embed-text"``)."""
        ...

    @property
    def dimensions(self) -> int:
        """The length of every vector this provider returns."""
        ...

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts, returning one vector per input in the same order."""
        ...

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query string (e.g. a user's search query at retrieval time)."""
        ...
