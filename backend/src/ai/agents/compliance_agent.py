"""Compliance Agent — regulatory guidance grounded in retrieved document context.

Thin adapter around :class:`~src.services.rag.rag_service.RagService`
(the Retrieval Service — see ``src/ai/agents/knowledge_agent.py`` for
the sibling agent that consumes the same service for general lookup).
Reached through the narrow :class:`RetrievalPort` rather than the
concrete class, following the pattern every agent in this package uses.

No LLM call happens anywhere in this module — every field on
:class:`ComplianceAssessment` is derived deterministically from the
:class:`~src.services.rag.schemas.RetrievedChunk` results the retrieval
service returns. This agent consumes retrieved context; it does not
generate an answer from it. Answer generation, if wanted later, is a
separate step that would consume this agent's output.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from src.ai.agents.base import AgentRequest, AgentResult
from src.utils.logger import get_logger

logger = get_logger(__name__)


# ── Engine port ───────────────────────────────────────────────────────────────


class RetrievalPort(Protocol):
    """Contract required from the RAG retrieval service.

    Matches :meth:`~src.services.rag.rag_service.RagService.query` —
    returns :class:`~src.services.rag.schemas.RetrievedChunk` results,
    each carrying ``source``/``title``/``chunk_index``/``content``.
    """

    def query(self, *, question: str, limit: int = 5, min_similarity: float | None = None) -> list[object]: ...


# ── Result shape ──────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class ComplianceAssessment:
    """Structured compliance guidance for a single request, built from retrieved context.

    Attributes:
        relevant_regulations: Distinct source regulation documents the
            retrieved chunks came from (e.g. an OISD or Factory Act
            document title/path), most-relevant first.
        applicable_sections: One entry per retrieved chunk, identifying
            where within its source document the passage came from.
        compliance_notes: The retrieved passages themselves — the raw
            grounding context, verbatim. Not a generated summary.
        recommendations: Deterministic, retrieval-derived guidance (see
            :func:`_build_recommendations`) — never model-generated
            text, since this agent makes no LLM call.
    """

    relevant_regulations: list[str]
    applicable_sections: list[str]
    compliance_notes: list[str]
    recommendations: list[str] = field(default_factory=list)


_NO_CONTEXT_RECOMMENDATION = (
    "No matching regulatory context was retrieved; consult a compliance "
    "officer or expand the document index before proceeding."
)
_REVIEW_RECOMMENDATION_TEMPLATE = "Review {regulation} before proceeding — it was matched as relevant to this request."
_LOW_CONFIDENCE_RECOMMENDATION = (
    "Retrieved context has low similarity to the request; treat these regulations as "
    "candidates only and verify applicability manually."
)
_LOW_CONFIDENCE_THRESHOLD = 0.5


class ComplianceAgent:
    """Reports relevant regulations, sections, and notes grounded in retrieved document context."""

    def __init__(self, retrieval_engine: RetrievalPort) -> None:
        self._retrieval_engine = retrieval_engine

    @property
    def name(self) -> str:
        return "compliance"

    def run(self, request: AgentRequest) -> AgentResult:
        limit = int(request.params.get("limit", 5))
        try:
            chunks = self._retrieval_engine.query(question=request.text, limit=limit)
        except Exception as exc:  # noqa: BLE001 - one agent's failure must not abort the others
            logger.warning("Compliance agent failed: %s", exc)
            return AgentResult(agent=self.name, summary="", error=str(exc))

        if not chunks:
            return AgentResult(
                agent=self.name,
                summary="No relevant regulatory context found for this request.",
                data=ComplianceAssessment(
                    relevant_regulations=[],
                    applicable_sections=[],
                    compliance_notes=[],
                    recommendations=[_NO_CONTEXT_RECOMMENDATION],
                ),
            )

        assessment = _build_assessment(chunks)
        citations = tuple(assessment.relevant_regulations)
        return AgentResult(
            agent=self.name,
            summary=(
                f"Found {len(assessment.applicable_sections)} applicable section(s) "
                f"across {len(assessment.relevant_regulations)} regulation(s)."
            ),
            data=assessment,
            citations=citations,
        )


def _build_assessment(chunks: list[object]) -> ComplianceAssessment:
    """Derive relevant regulations, sections, notes, and recommendations from retrieved chunks."""
    relevant_regulations = list(dict.fromkeys(chunk.title or chunk.source for chunk in chunks))
    applicable_sections = [_section_reference(chunk) for chunk in chunks]
    compliance_notes = [chunk.content for chunk in chunks]
    recommendations = _build_recommendations(chunks, relevant_regulations)

    return ComplianceAssessment(
        relevant_regulations=relevant_regulations,
        applicable_sections=applicable_sections,
        compliance_notes=compliance_notes,
        recommendations=recommendations,
    )


def _section_reference(chunk: object) -> str:
    """Identify where in its source document a retrieved chunk came from."""
    label = chunk.title or chunk.source
    if chunk.chunk_index is not None:
        return f"{label} (section {chunk.chunk_index + 1})"
    return label


def _build_recommendations(chunks: list[object], relevant_regulations: list[str]) -> list[str]:
    """Deterministic recommendations derived from retrieval results — no LLM call.

    One "review this regulation" recommendation per distinct source,
    plus a low-confidence warning if every match falls below
    ``_LOW_CONFIDENCE_THRESHOLD`` similarity (chunks with no similarity
    score, e.g. from plain document search, are treated as high
    confidence since they weren't ranked at all).
    """
    recommendations = [
        _REVIEW_RECOMMENDATION_TEMPLATE.format(regulation=regulation) for regulation in relevant_regulations
    ]

    similarities = [chunk.similarity for chunk in chunks if chunk.similarity is not None]
    if similarities and max(similarities) < _LOW_CONFIDENCE_THRESHOLD:
        recommendations.append(_LOW_CONFIDENCE_RECOMMENDATION)

    return recommendations
