"""RAG retrieval service: document search and semantic search over stored embeddings.

No LLM call happens here — see ``rag_service.py`` module docstring.
"""

from src.services.rag.rag_service import QueryEmbedderPort, RagService
from src.services.rag.schemas import RetrievedChunk

__all__ = ["RagService", "QueryEmbedderPort", "RetrievedChunk"]
