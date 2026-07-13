"""RAG request models (Pydantic v2)."""

from pydantic import Field

from src.schemas.base import AppBaseModel


class SemanticSearchRequest(AppBaseModel):
    """Request body for a semantic (embedding-based) search."""

    query: str = Field(..., min_length=1, max_length=2000, description="Free-text search query.")
    limit: int = Field(5, ge=1, le=50, description="Maximum number of chunks to return.")
    min_similarity: float | None = Field(
        None,
        ge=-1.0,
        le=1.0,
        description="Drop matches below this cosine similarity threshold, if given.",
    )


class RagQueryRequest(AppBaseModel):
    """Request body for the RAG query endpoint.

    Retrieval-only today (no LLM call) — see ``src/routes/rag.py`` module
    docstring. Shaped as a question rather than a bare search string so
    the payload doesn't need to change once answer generation is added.
    """

    question: str = Field(..., min_length=1, max_length=2000, description="Natural-language question.")
    limit: int = Field(5, ge=1, le=50, description="Maximum number of supporting chunks to retrieve.")
    min_similarity: float | None = Field(
        None,
        ge=-1.0,
        le=1.0,
        description="Drop matches below this cosine similarity threshold, if given.",
    )
