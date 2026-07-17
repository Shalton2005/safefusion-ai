"""Knowledge Agent — retrieval over ingested regulatory/incident documents.

Thin adapter around :class:`~src.services.rag.rag_service.RagService`.
Retrieval-only, matching that service's own contract (see its module
docstring) — this agent returns supporting chunks as its ``data``, not a
generated answer. Answer generation is a future LLM-backed enhancement
that would consume this agent's output, not replace it.

``run()``'s ``except Exception`` also catches
:class:`~src.services.embedding.exceptions.EmbeddingUnavailableError`
(raised by :meth:`~src.services.rag.rag_service.RagService.query` when
the embedding provider is unreachable or times out — see
``src/services/embedding/ollama_provider.py``) the same way it catches
any other retrieval failure: as a degraded :class:`~src.ai.agents.base.AgentResult`,
never a crash.
"""

from __future__ import annotations

from typing import Protocol

from src.ai.agents.base import AgentRequest, AgentResult
from src.utils.logger import get_logger

logger = get_logger(__name__)


class KnowledgeEnginePort(Protocol):
    """Contract required from the RAG service."""

    def query(self, *, question: str, limit: int = 5, min_similarity: float | None = None) -> list[object]: ...


class KnowledgeAgent:
    """Retrieves supporting context chunks for a natural-language question."""

    def __init__(self, engine: KnowledgeEnginePort) -> None:
        self._engine = engine

    @property
    def name(self) -> str:
        return "knowledge"

    def run(self, request: AgentRequest) -> AgentResult:
        limit = int(request.params.get("limit", 5))
        try:
            chunks = self._engine.query(question=request.text, limit=limit)
        except Exception as exc:  # noqa: BLE001 - one agent's failure must not abort the others
            logger.warning("Knowledge agent failed: %s", exc)
            return AgentResult(agent=self.name, summary="", error=str(exc))

        if not chunks:
            return AgentResult(agent=self.name, summary="No relevant documentation found.", data=[])

        citations = tuple(dict.fromkeys(chunk.source for chunk in chunks))
        return AgentResult(
            agent=self.name,
            summary=f"Found {len(chunks)} relevant document chunk(s) across {len(citations)} source(s).",
            data=chunks,
            citations=citations,
        )
