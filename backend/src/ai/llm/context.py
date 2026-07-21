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
    page: int | None = None

    @classmethod
    def from_retrieved_chunk(cls, chunk: object) -> "RagContextItem":
        """Adapt a :class:`~src.services.rag.schemas.RetrievedChunk` (or duck-typed equivalent)."""
        return cls(
            content=chunk.content,
            source=chunk.source,
            title=getattr(chunk, "title", None),
            page=getattr(chunk, "page", None),
        )

    @property
    def display_name(self) -> str:
        """Filename-style label a citation should show — prefers the source path's
        basename over ``title`` when a title exists (some PDFs' embedded
        document-info title is a generic string, not the filename the user
        actually recognizes), falling back to the raw ``source`` if it has
        no path separators at all (e.g. already a bare filename)."""
        from pathlib import PurePath

        return PurePath(self.source).name or self.title or self.source

    def format(self) -> str:
        label = self.title or self.display_name
        location = f", Page {self.page}" if self.page is not None else ""
        return f"- [{label}{location}] {self.content}"


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

    def format_sources(self) -> str:
        """Render a deterministic "Sources:" citation block from ``rag``, deduped by
        (document, page) and in first-seen order (retrieval's own relevance
        ranking, since ``rag`` is built from ranked chunks — see
        ``src.ai.copilot.service._build_llm_context``).

        Built independently of whatever the model's own generated text
        says — appended by :func:`~src.ai.copilot.service._generate_or_degrade`'s
        callers after generation, so a citation is guaranteed to appear
        even if the model doesn't mention its sources by name (local
        models don't reliably follow that instruction — see
        :mod:`src.ai.prompts`' system prompts, which additionally *ask*
        the model to cite inline; this is the deterministic backstop, not
        a replacement for that instruction).

        Returns an empty string when there is no RAG context to cite —
        callers should skip appending in that case rather than show an
        empty "Sources:" heading.
        """
        if not self.rag:
            return ""

        seen: dict[tuple[str, int | None], None] = {}
        for item in self.rag:
            seen.setdefault((item.display_name, item.page), None)

        entries = list(seen.keys())
        if len(entries) == 1:
            name, page = entries[0]
            location = f"\nPage: {page}" if page is not None else ""
            return f"Source:\n{name}{location}"

        lines = [f"{name} (Page {page})" if page is not None else name for name, page in entries]
        return "Sources:\n" + "\n".join(lines)
