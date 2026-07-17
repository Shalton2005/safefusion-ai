"""Explainability Service — structured, auditable "why did the system say this" report.

Deterministic post-processing step over the results the
:class:`~src.ai.agents.supervisor.Supervisor` already produced — the same
input :mod:`~src.ai.agents.response_aggregator` consumes. It makes **no
LLM call** and reaches no engine or service directly; every field is
derived purely from each agent's own
:class:`~src.ai.agents.base.AgentResult`.

Distinct from :mod:`~src.ai.agents.response_aggregator`: that module
builds an operator-facing unified response (what to *do*); this module
builds an audit/explainability report (why the system said what it
said) — evidence, graph relationships, retrieved regulations, and a
per-agent contribution breakdown, serializable straight to JSON for a
"why" panel or compliance log. The two are siblings reading the same
``AgentResult`` list, not a layering of one over the other.

Modularity: each report section is a self-contained function keyed off
``AgentResult.agent`` (a lookup table, not branching) — the same pattern
``response_aggregator.py`` and every agent module in this package uses.
An agent absent from the input or one that failed contributes nothing to
a section rather than raising.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any, Callable

from src.ai.agents.base import AgentResult
from src.ai.agents.compliance_agent import ComplianceAssessment
from src.ai.agents.graph_knowledge_agent import GraphKnowledgeResult
from src.ai.agents.risk_agent import RiskAssessment

RISK_AGENT = "risk"
COMPLIANCE_AGENT = "compliance"
KNOWLEDGE_AGENT = "knowledge"
GRAPH_KNOWLEDGE_AGENT = "graph_knowledge"
EMERGENCY_AGENT = "emergency"


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
        weight: This agent's share of the overall confidence score (see
            :func:`_compute_confidence`) — how much it influenced
            :attr:`ExplainabilityReport.confidence`.
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
            what it contributed and how much it weighed toward
            :attr:`confidence`.
        confidence: 0.0-1.0 overall confidence in the explanation. See
            :func:`_compute_confidence`.
    """

    summary: str
    evidence_used: tuple[EvidenceItem, ...]
    graph_relationships: tuple[GraphRelationshipItem, ...]
    retrieved_regulations: tuple[RegulationReference, ...]
    agent_contributions: tuple[AgentContribution, ...]
    confidence: float

    def to_dict(self) -> dict[str, Any]:
        """Plain-dict form, ready for ``json.dumps`` or a Pydantic response model."""
        return asdict(self)

    def to_json(self, *, indent: int | None = None) -> str:
        """Structured JSON form of this report."""
        return json.dumps(self.to_dict(), indent=indent)


# ── Public entry point ──────────────────────────────────────────────────────


def explain(results: list[AgentResult]) -> ExplainabilityReport:
    """Build an :class:`ExplainabilityReport` from a list of agent results.

    Args:
        results: Typically ``SupervisorResponse.results`` (see
            ``src/ai/agents/supervisor.py``) — every agent the supervisor
            executed for one request, in execution order, including
            failed results.
    """
    by_agent = {result.agent: result for result in results}
    weights = _agent_weights(results)

    return ExplainabilityReport(
        summary=_section_summary(results),
        evidence_used=tuple(_section_evidence(by_agent.get(KNOWLEDGE_AGENT), by_agent.get(COMPLIANCE_AGENT))),
        graph_relationships=tuple(_section_graph_relationships(by_agent.get(GRAPH_KNOWLEDGE_AGENT))),
        retrieved_regulations=tuple(_section_regulations(by_agent.get(COMPLIANCE_AGENT))),
        agent_contributions=tuple(_section_agent_contributions(results, weights)),
        confidence=_compute_confidence(results, weights),
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


def _section_agent_contributions(
    results: list[AgentResult], weights: dict[str, float]
) -> list[AgentContribution]:
    """One :class:`AgentContribution` per executed agent, in execution order."""
    return [
        AgentContribution(
            agent=result.agent,
            ok=result.ok,
            summary=result.summary,
            weight=weights.get(result.agent, 0.0),
            citations=result.citations,
            error=result.error,
        )
        for result in results
    ]


# ── Confidence scoring ───────────────────────────────────────────────────────
#
# Shares the same weighting approach as response_aggregator._compute_confidence_score
# (per-agent weight table + per-agent scorer registry) so "confidence" means
# the same thing across both modules, but is kept as a private, separate
# implementation rather than imported — the two reports are independent
# contracts and shouldn't couple to each other's internals.

_AGENT_CONFIDENCE_WEIGHT: dict[str, float] = {
    RISK_AGENT: 1.0,
    COMPLIANCE_AGENT: 1.0,
    KNOWLEDGE_AGENT: 0.75,
    GRAPH_KNOWLEDGE_AGENT: 0.75,
    EMERGENCY_AGENT: 1.0,
}

_PER_AGENT_SCORER: dict[str, Callable[[AgentResult], float]] = {}


def _register_scorer(agent_name: str) -> Callable[[Callable[[AgentResult], float]], Callable[[AgentResult], float]]:
    def decorator(fn: Callable[[AgentResult], float]) -> Callable[[AgentResult], float]:
        _PER_AGENT_SCORER[agent_name] = fn
        return fn

    return decorator


@_register_scorer(RISK_AGENT)
def _score_risk(result: AgentResult) -> float:
    return 1.0 if result.data is not None else 0.5


@_register_scorer(COMPLIANCE_AGENT)
def _score_compliance(result: AgentResult) -> float:
    if not isinstance(result.data, ComplianceAssessment):
        return 0.0
    return 1.0 if result.data.relevant_regulations else 0.3


@_register_scorer(KNOWLEDGE_AGENT)
def _score_knowledge(result: AgentResult) -> float:
    return 1.0 if result.data else 0.3


@_register_scorer(GRAPH_KNOWLEDGE_AGENT)
def _score_graph_knowledge(result: AgentResult) -> float:
    if not isinstance(result.data, GraphKnowledgeResult):
        return 0.0
    return 1.0 if result.data.total_count else 0.3


@_register_scorer(EMERGENCY_AGENT)
def _score_emergency(result: AgentResult) -> float:
    return 1.0 if result.data is not None else 0.0


def _agent_weights(results: list[AgentResult]) -> dict[str, float]:
    """Each executed agent's share of the overall confidence score, normalized to sum to 1.0.

    Used both to compute :func:`_compute_confidence` and to populate
    :attr:`AgentContribution.weight`, so the two stay consistent — a
    reader can sum ``agent_contributions[*].weight`` and land on the same
    total-weight denominator the confidence score used.
    """
    raw = {result.agent: _AGENT_CONFIDENCE_WEIGHT.get(result.agent, 0.5) for result in results}
    total = sum(raw.values())
    if total == 0.0:
        return {}
    return {agent: weight / total for agent, weight in raw.items()}


def _compute_confidence(results: list[AgentResult], weights: dict[str, float]) -> float:
    """Weighted average of per-agent confidence, over agents that actually ran.

    An agent that failed contributes 0.0 at its normalized weight. An
    agent that never ran is excluded entirely (see :func:`_agent_weights`).
    No agents run at all returns 0.0.
    """
    if not results:
        return 0.0

    total = 0.0
    for result in results:
        weight = weights.get(result.agent, 0.0)
        if not result.ok:
            continue
        scorer = _PER_AGENT_SCORER.get(result.agent)
        score = scorer(result) if scorer else 0.5
        total += weight * score

    return round(total, 2)
