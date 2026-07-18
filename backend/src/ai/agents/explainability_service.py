"""Explainability Service — structured, auditable "why did the system say this" report.

Deterministic post-processing step over the results the
:class:`~src.ai.agents.supervisor.Supervisor` already produced — the same
input :mod:`~src.ai.agents.response_aggregator` consumes. It makes **no
LLM call** and reaches no engine or service directly; every field is
derived purely from each agent's own
:class:`~src.ai.agents.base.AgentResult`, plus (optionally) camera
evidence — see below.

Distinct from :mod:`~src.ai.agents.response_aggregator`: that module
builds an operator-facing unified response (what to *do*); this module
builds an audit/explainability report (why the system said what it
said) — evidence, graph relationships, retrieved regulations, a per-agent
contribution breakdown, and (Day 14) camera evidence, serializable
straight to JSON for a "why" panel or compliance log. The two are
siblings reading the same ``AgentResult`` list, not a layering of one
over the other.

Modularity: each report section is a self-contained function keyed off
``AgentResult.agent`` (a lookup table, not branching) — the same pattern
``response_aggregator.py`` and every agent module in this package uses.
An agent absent from the input or one that failed contributes nothing to
a section rather than raising.

``confidence`` delegates to :func:`~src.ai.confidence.default_confidence_engine`
— the canonical scorer also used by
:mod:`~src.ai.agents.response_aggregator` — rather than computing its
own, so "confidence" means the same thing everywhere it's reported.
Per-:class:`AgentContribution` ``weight`` is a separate, simpler
concept: each executed agent's equal share of attention in this report
(not the confidence engine's per-*factor* weighting, which combines
multiple agents into factors like "retrieval relevance" that don't map
1:1 onto a single agent).

Camera evidence (Day 14): Computer Vision findings are not produced by a
Supervisor agent (see :mod:`~src.ai.agents.camera_evidence`'s module
docstring for why), so they can't be read off an ``AgentResult`` the way
every other section here is. ``explain()`` accepts an optional
``zone_compound_risk_results`` parameter instead — when supplied, any
camera-sourced compound-risk rule matches it contains are folded into a
``camera_evidence`` section via
:func:`~src.ai.agents.camera_evidence.build_camera_evidence`. Omitting it
(the default) leaves ``camera_evidence`` empty, so every existing caller
of ``explain(results)`` keeps working unchanged.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any

from src.ai.agents.base import AgentResult
from src.ai.agents.camera_evidence import CameraEvidenceSection, build_camera_evidence
from src.ai.agents.compliance_agent import ComplianceAssessment
from src.ai.agents.graph_knowledge_agent import GraphKnowledgeResult
from src.ai.confidence import default_confidence_engine
from src.services.compound_risk.schemas import ZoneCompoundRiskResult

COMPLIANCE_AGENT = "compliance"
KNOWLEDGE_AGENT = "knowledge"
GRAPH_KNOWLEDGE_AGENT = "graph_knowledge"


# ── Report shape ─────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class EvidenceItem:
    """One piece of evidence backing the response, tagged with where it came from."""

    source_agent: str
    content: str
    origin: str


@dataclass(frozen=True, slots=True)
class GraphRelationshipItem:
    """One graph relationship record surfaced in the explanation, JSON-serializable as-is."""

    category: str
    query: str
    record: dict[str, Any]


@dataclass(frozen=True, slots=True)
class RegulationReference:
    """One regulation/document the Compliance agent matched, with its supporting section."""

    regulation: str
    section: str


@dataclass(frozen=True, slots=True)
class AgentContribution:
    """What one executed agent contributed to the overall response.

    Attributes:
        agent: Registry name of the agent (e.g. ``"risk"``).
        ok: Whether the agent succeeded.
        summary: The agent's own one-line summary of what it found.
        weight: This agent's equal share of attention among every
            executed agent (``1 / len(results)``) — a simple
            "how many agents were involved" indicator, not the
            Confidence Engine's per-factor weighting (see module
            docstring for why the two don't share a definition).
        citations: Supporting references the agent returned, if any.
        error: Failure reason, if ``ok`` is ``False``.
    """

    agent: str
    ok: bool
    summary: str
    weight: float
    citations: tuple[str, ...] = field(default_factory=tuple)
    error: str | None = None


@dataclass(frozen=True, slots=True)
class ExplainabilityReport:
    """Structured explanation of how a response was produced.

    Attributes:
        summary: One-paragraph synthesis across every agent that ran,
            built from each agent's own summary — not regenerated text.
        evidence_used: Every retrieved passage that grounded the
            response (Knowledge + Compliance), tagged by source agent.
        graph_relationships: Every knowledge-graph relationship record
            the Graph Knowledge agent surfaced, grouped by category.
        retrieved_regulations: Regulation/document + matched section
            pairs the Compliance agent found.
        agent_contributions: One entry per executed agent, describing
            what it contributed.
        confidence: 0.0-1.0 overall confidence in the explanation, from
            :func:`~src.ai.confidence.default_confidence_engine`.
        camera_evidence: Camera-sourced compound-risk findings (Day 14) —
            empty unless the caller passed ``zone_compound_risk_results``
            to :func:`explain`. See
            :mod:`~src.ai.agents.camera_evidence` for why this is a
            distinct, non-``AgentResult``-backed section.
    """

    summary: str
    evidence_used: tuple[EvidenceItem, ...]
    graph_relationships: tuple[GraphRelationshipItem, ...]
    retrieved_regulations: tuple[RegulationReference, ...]
    agent_contributions: tuple[AgentContribution, ...]
    confidence: float
    camera_evidence: CameraEvidenceSection = field(default_factory=CameraEvidenceSection)

    def to_dict(self) -> dict[str, Any]:
        """Plain-dict form, ready for ``json.dumps`` or a Pydantic response model."""
        return asdict(self)

    def to_json(self, *, indent: int | None = None) -> str:
        """Structured JSON form of this report."""
        return json.dumps(self.to_dict(), indent=indent)


# ── Public entry point ──────────────────────────────────────────────────────


def explain(
    results: list[AgentResult],
    zone_compound_risk_results: list[ZoneCompoundRiskResult] | None = None,
) -> ExplainabilityReport:
    """Build an :class:`ExplainabilityReport` from a list of agent results.

    Args:
        results: Typically ``SupervisorResponse.results`` (see
            ``src/ai/agents/supervisor.py``) — every agent the supervisor
            executed for one request, in execution order, including
            failed results.
        zone_compound_risk_results: Optional Compound Risk Engine output
            (typically ``CompoundRiskService.detect_compound_risks()``)
            for the zone(s) this request concerns. When supplied, any
            camera-sourced triggered rules within it populate the
            report's ``camera_evidence`` section (see
            :mod:`~src.ai.agents.camera_evidence`). Omitted by default so
            existing callers that only have agent results are unaffected.
    """
    by_agent = {result.agent: result for result in results}

    return ExplainabilityReport(
        summary=_section_summary(results),
        evidence_used=tuple(_section_evidence(by_agent.get(KNOWLEDGE_AGENT), by_agent.get(COMPLIANCE_AGENT))),
        graph_relationships=tuple(_section_graph_relationships(by_agent.get(GRAPH_KNOWLEDGE_AGENT))),
        retrieved_regulations=tuple(_section_regulations(by_agent.get(COMPLIANCE_AGENT))),
        agent_contributions=tuple(_section_agent_contributions(results)),
        confidence=default_confidence_engine().score(results).overall_score,
        camera_evidence=build_camera_evidence(zone_compound_risk_results or []),
    )


# ── Section extractors ───────────────────────────────────────────────────────


def _section_summary(results: list[AgentResult]) -> str:
    """One paragraph joining each successful agent's own summary; notes failures separately."""
    if not results:
        return "No agents were run for this request."

    lines = [result.summary for result in results if result.ok and result.summary]
    failures = [f"{result.agent} agent failed: {result.error}" for result in results if not result.ok]
    return " ".join(lines + failures) or "No findings were produced for this request."


def _section_evidence(
    knowledge_result: AgentResult | None, compliance_result: AgentResult | None
) -> list[EvidenceItem]:
    """Retrieved passages that grounded the response, tagged with their source agent."""
    evidence: list[EvidenceItem] = []

    if knowledge_result is not None and knowledge_result.ok and knowledge_result.data:
        evidence.extend(
            EvidenceItem(source_agent=KNOWLEDGE_AGENT, content=chunk.content, origin=chunk.source)
            for chunk in knowledge_result.data
        )

    if compliance_result is not None and compliance_result.ok and isinstance(compliance_result.data, ComplianceAssessment):
        assessment = compliance_result.data
        origins = assessment.relevant_regulations or ["unknown"]
        evidence.extend(
            EvidenceItem(source_agent=COMPLIANCE_AGENT, content=note, origin=origins[i % len(origins)])
            for i, note in enumerate(assessment.compliance_notes)
        )

    return evidence


def _section_graph_relationships(graph_result: AgentResult | None) -> list[GraphRelationshipItem]:
    """Every graph relationship record the Graph Knowledge agent surfaced, flattened across categories."""
    if graph_result is None or not graph_result.ok or not isinstance(graph_result.data, GraphKnowledgeResult):
        return []

    result = graph_result.data
    categories = (
        ("worker", result.worker_relationships),
        ("equipment", result.equipment_relationships),
        ("zone", result.zone_relationships),
        ("incident", result.incident_history),
    )
    return [
        GraphRelationshipItem(category=category, query=relationship.query, record=dict(relationship.record))
        for category, relationships in categories
        for relationship in relationships
    ]


def _section_regulations(compliance_result: AgentResult | None) -> list[RegulationReference]:
    """Regulation + matched-section pairs the Compliance agent found, one per applicable section."""
    if (
        compliance_result is None
        or not compliance_result.ok
        or not isinstance(compliance_result.data, ComplianceAssessment)
    ):
        return []

    assessment = compliance_result.data
    regulations = assessment.relevant_regulations or ["unknown"]
    return [
        RegulationReference(regulation=regulations[i % len(regulations)], section=section)
        for i, section in enumerate(assessment.applicable_sections)
    ]


def _section_agent_contributions(results: list[AgentResult]) -> list[AgentContribution]:
    """One :class:`AgentContribution` per executed agent, in execution order."""
    weight = round(1 / len(results), 4) if results else 0.0
    return [
        AgentContribution(
            agent=result.agent,
            ok=result.ok,
            summary=result.summary,
            weight=weight,
            citations=result.citations,
            error=result.error,
        )
        for result in results
    ]
