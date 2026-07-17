"""Response Aggregator — combines Risk/Compliance/Knowledge/Emergency output into one unified response.

Deterministic post-processing step over the results the
:class:`~src.ai.agents.supervisor.Supervisor` already produced. It makes
**no LLM call** and reaches no engine or service directly — every field
below is derived purely from each agent's own
:class:`~src.ai.agents.base.AgentResult` (``summary``/``data``/
``citations``/``error``), the same objects the supervisor already
aggregates into a single joined-string summary. This module exists
because that joined string isn't the shape a caller (UI, report,
notification) actually wants: six named sections — Executive Summary,
Risk Assessment, Supporting Evidence, Regulatory References, Recommended
Actions, Confidence Score.

Modularity: extraction of each section is a self-contained function keyed
off ``AgentResult.agent`` (a lookup table, not branching), so adding a
future agent's contribution to a section is a new table entry, not a
rewrite of the aggregation loop. An agent absent from ``results`` (not
routed for this request) or one that failed (``result.ok is False``)
simply contributes nothing to a section rather than raising — the same
"one agent's problem never blocks the others" rule the supervisor itself
follows.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from src.ai.agents.base import AgentResult
from src.ai.agents.compliance_agent import ComplianceAssessment
from src.ai.agents.emergency_categorization import EmergencyAssessment
from src.ai.agents.risk_agent import RiskAssessment

# Agent registry names this module knows how to read from. Not an
# exhaustive allow-list — an unrecognized agent name is simply skipped by
# every section extractor (see each ``_section_*`` function) — but naming
# them here documents which four the aggregator's contract targets.
RISK_AGENT = "risk"
COMPLIANCE_AGENT = "compliance"
KNOWLEDGE_AGENT = "knowledge"
EMERGENCY_AGENT = "emergency"


# ── Unified response shape ──────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class ZoneRiskFinding:
    """One zone's risk finding, as surfaced in :attr:`UnifiedResponse.risk_assessment`."""

    zone: str
    risk_level: str
    risk_score: float
    hazards: tuple[str, ...]
    reasoning: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class UnifiedResponse:
    """The single structured response returned to a caller.

    Attributes:
        executive_summary: One-paragraph, human-readable synthesis across
            every agent that ran — built from each agent's own
            ``AgentResult.summary``, not regenerated text.
        risk_assessment: Risk agent findings, one entry per zone. Empty
            if the Risk agent didn't run or found nothing.
        supporting_evidence: Retrieved passages/chunks backing the other
            sections — from the Knowledge agent's chunks and the
            Compliance agent's retrieved notes.
        regulatory_references: Distinct regulation/document titles the
            Compliance agent matched, most-relevant first.
        recommended_actions: Deduplicated, ordered actions pooled from
            every agent's own recommendations (Risk, Compliance) and the
            Emergency agent's immediate actions/notifications.
        confidence_score: 0.0-1.0. See :func:`_compute_confidence_score`.
        agent_errors: Agent name -> error message, for agents that ran
            but failed. Callers that only want the happy-path sections
            can ignore this; callers building an operator-facing report
            should surface it.
    """

    executive_summary: str
    risk_assessment: tuple[ZoneRiskFinding, ...]
    supporting_evidence: tuple[str, ...]
    regulatory_references: tuple[str, ...]
    recommended_actions: tuple[str, ...]
    confidence_score: float
    agent_errors: dict[str, str] = field(default_factory=dict)


# ── Public entry point ──────────────────────────────────────────────────────


def aggregate(results: list[AgentResult]) -> UnifiedResponse:
    """Combine a list of agent results into one :class:`UnifiedResponse`.

    Args:
        results: Typically ``SupervisorResponse.results`` (see
            ``src/ai/agents/supervisor.py``) — every agent the supervisor
            executed for one request, in execution order, including
            failed results. Works equally well on a hand-built subset
            (e.g. only Risk + Emergency) since every section extractor
            degrades gracefully when an agent is absent.
    """
    by_agent = {result.agent: result for result in results}

    return UnifiedResponse(
        executive_summary=_section_executive_summary(results),
        risk_assessment=tuple(_section_risk_assessment(by_agent.get(RISK_AGENT))),
        supporting_evidence=tuple(
            _section_supporting_evidence(by_agent.get(KNOWLEDGE_AGENT), by_agent.get(COMPLIANCE_AGENT))
        ),
        regulatory_references=tuple(_section_regulatory_references(by_agent.get(COMPLIANCE_AGENT))),
        recommended_actions=tuple(
            _section_recommended_actions(
                by_agent.get(RISK_AGENT), by_agent.get(COMPLIANCE_AGENT), by_agent.get(EMERGENCY_AGENT)
            )
        ),
        confidence_score=_compute_confidence_score(results),
        agent_errors={result.agent: result.error for result in results if not result.ok and result.error},
    )


# ── Section extractors ───────────────────────────────────────────────────────
#
# Each function is pure and touches only the AgentResult(s) it's given —
# no shared state, no I/O, no LLM call. That's what makes this module
# reusable: any caller with a list of AgentResult (a full supervisor run,
# a partial one, a test fixture) gets the same six sections.


def _section_executive_summary(results: list[AgentResult]) -> str:
    """One paragraph joining each successful agent's own summary; notes failures separately."""
    if not results:
        return "No agents were run for this request."

    lines = [result.summary for result in results if result.ok and result.summary]
    failures = [f"{result.agent} agent failed: {result.error}" for result in results if not result.ok]
    return " ".join(lines + failures) or "No findings were produced for this request."


def _section_risk_assessment(risk_result: AgentResult | None) -> list[ZoneRiskFinding]:
    """Per-zone risk findings from the Risk agent."""
    if risk_result is None or not risk_result.ok or not risk_result.data:
        return []

    assessments: list[RiskAssessment] = risk_result.data
    return [
        ZoneRiskFinding(
            zone=assessment.zone,
            risk_level=assessment.risk_level,
            risk_score=assessment.risk_score,
            hazards=tuple(hazard.description for hazard in assessment.detected_hazards),
            reasoning=tuple(assessment.reasoning),
        )
        for assessment in assessments
    ]


def _section_supporting_evidence(
    knowledge_result: AgentResult | None, compliance_result: AgentResult | None
) -> list[str]:
    """Retrieved passages backing the response — Knowledge agent chunks + Compliance agent notes."""
    evidence: list[str] = []

    if knowledge_result is not None and knowledge_result.ok and knowledge_result.data:
        evidence.extend(chunk.content for chunk in knowledge_result.data)

    if compliance_result is not None and compliance_result.ok and isinstance(compliance_result.data, ComplianceAssessment):
        evidence.extend(compliance_result.data.compliance_notes)

    return list(dict.fromkeys(evidence))


def _section_regulatory_references(compliance_result: AgentResult | None) -> list[str]:
    """Distinct regulation/document titles the Compliance agent matched, most-relevant first."""
    if (
        compliance_result is None
        or not compliance_result.ok
        or not isinstance(compliance_result.data, ComplianceAssessment)
    ):
        return []
    return list(compliance_result.data.relevant_regulations)


def _section_recommended_actions(
    risk_result: AgentResult | None,
    compliance_result: AgentResult | None,
    emergency_result: AgentResult | None,
) -> list[str]:
    """Deduplicated, ordered actions pooled from Risk, Compliance, and Emergency output.

    Order matters for a reader triaging a report: Emergency's immediate
    actions come first (most time-critical), then Risk's corrective
    recommendations, then Compliance's regulatory guidance.
    """
    actions: list[str] = []

    if emergency_result is not None and emergency_result.ok and isinstance(emergency_result.data, EmergencyAssessment):
        actions.extend(f"{a.zone}: {a.action} — {a.reason}" for a in emergency_result.data.immediate_actions)
        actions.extend(f"Notify {n.recipient} ({n.zone}): {n.reason}" for n in emergency_result.data.notifications)

    if risk_result is not None and risk_result.ok and risk_result.data:
        assessments: list[RiskAssessment] = risk_result.data
        for assessment in assessments:
            actions.extend(assessment.recommendations)

    if compliance_result is not None and compliance_result.ok and isinstance(compliance_result.data, ComplianceAssessment):
        actions.extend(compliance_result.data.recommendations)

    return list(dict.fromkeys(actions))


# ── Confidence scoring ───────────────────────────────────────────────────────

# Per-agent weight in the overall confidence score. Data, not branching
# logic — mirrors the lookup-table pattern used throughout this package
# (RiskAgent's rule->recommendation table, routing's keyword table).
# Weights need not sum to 1; the score is normalized against the weight
# of agents that actually ran.
_AGENT_CONFIDENCE_WEIGHT: dict[str, float] = {
    RISK_AGENT: 1.0,
    COMPLIANCE_AGENT: 1.0,
    KNOWLEDGE_AGENT: 0.75,
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
    """1.0 if zones were assessed (even zero-risk-found is a confident answer)."""
    return 1.0 if result.data is not None else 0.5


@_register_scorer(COMPLIANCE_AGENT)
def _score_compliance(result: AgentResult) -> float:
    """Retrieval-confidence proxy: did we find grounding context at all."""
    if not isinstance(result.data, ComplianceAssessment):
        return 0.0
    return 1.0 if result.data.relevant_regulations else 0.3


@_register_scorer(KNOWLEDGE_AGENT)
def _score_knowledge(result: AgentResult) -> float:
    return 1.0 if result.data else 0.3


@_register_scorer(EMERGENCY_AGENT)
def _score_emergency(result: AgentResult) -> float:
    if not isinstance(result.data, EmergencyAssessment):
        return 0.0
    return 1.0


def _compute_confidence_score(results: list[AgentResult]) -> float:
    """Weighted average of per-agent confidence, over agents that actually ran.

    An agent that failed contributes 0.0 at its full weight (a failure
    should visibly drag confidence down, not be silently excluded). An
    agent that never ran (not in ``results`` at all) is excluded from
    both the numerator and denominator — the score reflects confidence
    in what was produced, not a penalty for agents the router didn't
    need. No agents run at all returns 0.0.
    """
    if not results:
        return 0.0

    total_weight = 0.0
    weighted_sum = 0.0
    for result in results:
        weight = _AGENT_CONFIDENCE_WEIGHT.get(result.agent, 0.5)
        total_weight += weight
        if not result.ok:
            continue
        scorer = _PER_AGENT_SCORER.get(result.agent)
        score = scorer(result) if scorer else 0.5
        weighted_sum += weight * score

    if total_weight == 0.0:
        return 0.0
    return round(weighted_sum / total_weight, 2)
