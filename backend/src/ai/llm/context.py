"""Typed context inputs accepted by the LLM service.

The LLM service accepts context from exactly three sources — RAG
retrieval, the Neo4j knowledge graph, and the Risk Engine — each as its
own small, explicit dataclass rather than a single untyped blob. Keeping
them distinct (instead of pre-flattening everything into one string
before it reaches the service) means:

    - Each source can be supplied independently — a caller with only
      risk data doesn't need to fabricate empty RAG/graph sections.
    - Formatting (how a source's data becomes prompt text) lives in one
      place per source, next to the type it formats, not scattered
      across call sites.
    - Adding a fourth context source later is one new dataclass + one
      new field on :class:`LlmContext`, not a change to every caller's
      string-building code.

Callers build these from whatever shape their own layer already
produces — e.g. ``RagContextItem.from_retrieved_chunk`` adapts
:class:`~src.services.rag.schemas.RetrievedChunk` — so this module has
no import-time dependency on the RAG/graph/risk services themselves.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# ── RAG context ───────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class RagContextItem:
    """One retrieved document passage, as the LLM service consumes it.

    Structurally identical to :class:`~src.services.rag.schemas.RetrievedChunk`
    (or :class:`~src.ai.agents.compliance_agent.ComplianceAssessment`'s
    notes), but declared independently so this module doesn't import the
    RAG service package — callers adapt via :meth:`from_retrieved_chunk`.
    """

    content: str
    source: str
    title: str | None = None

    @classmethod
    def from_retrieved_chunk(cls, chunk: object) -> "RagContextItem":
        """Adapt a :class:`~src.services.rag.schemas.RetrievedChunk` (or duck-typed equivalent)."""
        return cls(content=chunk.content, source=chunk.source, title=getattr(chunk, "title", None))

    def format(self) -> str:
        label = self.title or self.source
        return f"- [{label}] {self.content}"


# ── Knowledge graph context ──────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class GraphContextItem:
    """One graph relationship record, as the LLM service consumes it."""

    category: str
    record: dict[str, Any]

    @classmethod
    def from_graph_relationship(cls, category: str, relationship: object) -> "GraphContextItem":
        """Adapt a :class:`~src.ai.agents.graph_knowledge_agent.GraphRelationship`."""
        return cls(category=category, record=dict(relationship.record))

    def format(self) -> str:
        fields = ", ".join(f"{key}={value}" for key, value in self.record.items())
        return f"- [{self.category}] {fields}"


# ── Risk engine context ──────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class RiskContextItem:
    """One zone's risk assessment, as the LLM service consumes it."""

    zone: str
    risk_level: str
    risk_score: float
    hazards: list[str] = field(default_factory=list)
    reasoning: list[str] = field(default_factory=list)

    @classmethod
    def from_risk_assessment(cls, assessment: object) -> "RiskContextItem":
        """Adapt a :class:`~src.ai.agents.risk_agent.RiskAssessment`."""
        return cls(
            zone=assessment.zone,
            risk_level=assessment.risk_level,
            risk_score=assessment.risk_score,
            hazards=[hazard.description for hazard in assessment.detected_hazards],
            reasoning=list(assessment.reasoning),
        )

    @classmethod
    def from_emergency_escalation(cls, escalation: object, actions: list[str]) -> "RiskContextItem":
        """Adapt one zone's :class:`~src.ai.agents.emergency_categorization.Escalation` + dispatched actions.

        The Emergency agent has no dedicated context-source type of its
        own — :class:`LlmContext` accepts exactly three sources (RAG,
        graph, Risk Engine) by design. Dispatched emergency actions are
        zone-scoped and score/level-bearing just like a risk assessment,
        so they fold into ``reasoning`` here rather than expanding
        :class:`LlmContext`'s contract for a single extra source.
        """
        return cls(
            zone=escalation.zone,
            risk_level=escalation.risk_level,
            risk_score=escalation.risk_score,
            hazards=[],
            reasoning=[escalation.reason, *actions],
        )

    def format(self) -> str:
        hazards = "; ".join(self.hazards) or "none"
        reasoning = "; ".join(self.reasoning) or "none"
        return (
            f"- Zone '{self.zone}': {self.risk_level} risk (score {self.risk_score:.0f}). "
            f"Hazards: {hazards}. Reasoning: {reasoning}."
        )


# ── Unified context ───────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class LlmContext:
    """All context supplied to a single LLM generation call.

    Every field is optional and independently populated — a caller
    passes whichever sources it actually has. An entirely empty
    ``LlmContext()`` is valid; :mod:`src.ai.prompts` renders it as
    "no supporting context available" rather than an empty section.
    """

    rag: list[RagContextItem] = field(default_factory=list)
    graph: list[GraphContextItem] = field(default_factory=list)
    risk: list[RiskContextItem] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not (self.rag or self.graph or self.risk)
