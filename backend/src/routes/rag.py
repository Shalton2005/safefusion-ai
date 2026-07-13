"""RAG (Retrieval-Augmented Generation) routes for SafeFusion AI API v1.

Thin Route -> Service -> Repository endpoints exposing retrieval over the
pgvector-backed ``document_embeddings`` table (OISD/Factory Act/DGMS
regulatory documents and incident reports — see ``docs/tech-stack.md``).

Exposes three read-only endpoints:
    - ``GET  /rag/documents``       — plain metadata search by source (no embedding call).
    - ``POST /rag/search``          — semantic search: embed the query, rank by cosine similarity.
    - ``POST /rag/query``           — retrieval for a natural-language question.

No LLM call happens in this module or the service it calls. ``/rag/query``
returns retrieved supporting chunks (``context_chunks``), not a generated
``answer`` — answer generation is a deliberately separate, not-yet-built
step that will consume this endpoint's output as its grounding context.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.database.session import get_db
from src.repositories.document_embedding import DocumentEmbeddingRepository
from src.schemas.request.rag import RagQueryRequest, SemanticSearchRequest
from src.schemas.response.rag import (
    DocumentSearchResponse,
    RagQueryResponse,
    RetrievedChunkResponse,
    SemanticSearchResponse,
)
from src.services.embedding.config import OllamaEmbeddingConfig
from src.services.embedding.ollama_provider import OllamaEmbeddingProvider
from src.services.embedding.service import EmbeddingService
from src.services.rag.rag_service import RagService
from src.services.rag.schemas import RetrievedChunk

router: APIRouter = APIRouter(prefix="/rag", tags=["RAG"])

DbDep = Annotated[Session, Depends(get_db)]


def get_rag_service(db: DbDep) -> RagService:
    """Create the RAG service with the pgvector repository and embedding provider wired in.

    ``OllamaEmbeddingProvider`` connects lazily — constructing it here
    performs no network I/O, so this dependency is cheap even when Ollama
    isn't reachable. A request only fails if it actually needs to embed a
    query (semantic search / query), not on every request to this router
    (document search never embeds).
    """
    provider = OllamaEmbeddingProvider(
        OllamaEmbeddingConfig(model=settings.OLLAMA_EMBEDDING_MODEL, base_url=settings.OLLAMA_BASE_URL)
    )
    return RagService(
        repository=DocumentEmbeddingRepository(db),
        embedder=EmbeddingService(provider),
    )


RagServiceDep = Annotated[RagService, Depends(get_rag_service)]


def _to_response(chunk: RetrievedChunk) -> RetrievedChunkResponse:
    return RetrievedChunkResponse(
        id=chunk.id,
        content=chunk.content,
        source=chunk.source,
        title=chunk.title,
        file_type=chunk.file_type,
        chunk_index=chunk.chunk_index,
        similarity=chunk.similarity,
    )


@router.get(
    "/documents",
    summary="Search ingested chunks by source document",
    description=(
        "Returns every stored chunk ingested from a given source document, "
        "in chunk order. Plain metadata lookup — no embedding model is "
        "invoked, so this endpoint works even when Ollama is unreachable."
    ),
    response_model=DocumentSearchResponse,
    response_description="Every stored chunk for the given source document.",
)
def search_documents(
    service: RagServiceDep,
    source: str,
) -> DocumentSearchResponse:
    chunks = service.search_documents(source=source)
    return DocumentSearchResponse(
        source=source,
        chunk_count=len(chunks),
        chunks=[_to_response(chunk) for chunk in chunks],
    )


@router.post(
    "/search",
    summary="Semantic search over ingested document chunks",
    description=(
        "Embeds the query with the configured Ollama embedding model and "
        "returns the most similar stored chunks, ranked by cosine "
        "similarity (most relevant first). Retrieval only — no LLM call."
    ),
    response_model=SemanticSearchResponse,
    response_description="Chunks most semantically similar to the query.",
)
def semantic_search(
    service: RagServiceDep,
    payload: SemanticSearchRequest,
) -> SemanticSearchResponse:
    results = service.semantic_search(
        query=payload.query,
        limit=payload.limit,
        min_similarity=payload.min_similarity,
    )
    return SemanticSearchResponse(
        query=payload.query,
        result_count=len(results),
        results=[_to_response(chunk) for chunk in results],
    )


@router.post(
    "/query",
    summary="Retrieve supporting context for a natural-language question",
    description=(
        "Embeds the question and returns the most relevant stored chunks "
        "as supporting context. Retrieval only — this endpoint does not "
        "call an LLM and does not return a generated answer; "
        "`context_chunks` is the grounding material a future generation "
        "step would consume."
    ),
    response_model=RagQueryResponse,
    response_description="Supporting context chunks retrieved for the question.",
)
def query(
    service: RagServiceDep,
    payload: RagQueryRequest,
) -> RagQueryResponse:
    results = service.query(
        question=payload.question,
        limit=payload.limit,
        min_similarity=payload.min_similarity,
    )
    return RagQueryResponse(
        question=payload.question,
        context_chunks=[_to_response(chunk) for chunk in results],
    )
