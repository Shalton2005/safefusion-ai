"""Provider-agnostic embedding service: turn text chunks into vectors for pgvector storage.

Defaults to Ollama's ``nomic-embed-text`` (see ``ollama_provider.py``), but
the service (``service.py``) depends only on the ``EmbeddingProviderPort``
seam — swapping models or providers requires no change to it.
"""

from src.services.embedding.config import OllamaEmbeddingConfig
from src.services.embedding.ollama_provider import OllamaEmbeddingProvider
from src.services.embedding.port import EmbeddingProviderPort
from src.services.embedding.schemas import EmbeddedChunk
from src.services.embedding.service import EmbeddingService

__all__ = [
    "EmbeddingProviderPort",
    "EmbeddingService",
    "EmbeddedChunk",
    "OllamaEmbeddingConfig",
    "OllamaEmbeddingProvider",
]
