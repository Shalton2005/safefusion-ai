"""Confidence Engine — the canonical overall-confidence score for a Supervisor run.

Single source of truth for "how confident is the system in this
response," considering five factors:

    - **Risk Agent confidence** — did the Risk agent produce a real,
      successful assessment.
    - **Retrieval relevance** — how relevant the Knowledge/Compliance
      agents' retrieved context was (similarity scores where the
      retrieval layer provides them, match presence otherwise).
    - **Knowledge Graph matches** — how many/how well the Graph
      Knowledge agent's relationship lookups matched.
    - **Emergency Agent confidence** — did the Emergency agent produce a
      real, successful response for zones under compound risk. Scored
      the same way as the Risk Agent factor (a dedicated, full-weight
      factor, not folded into agent consistency) since a failed
      emergency-response assessment is a safety-critical failure that
      must visibly lower confidence on its own, not just nudge the
      generic pass/fail ratio below.
    - **Agent consistency** — how much the executed agents agree, i.e.
      how few of them failed relative to how many ran. A run where every
      agent succeeded is more trustworthy than one where half failed,
      independent of any single agent's own score.

:mod:`~src.ai.agents.response_aggregator` and
:mod:`~src.ai.agents.explainability_service` both call
:func:`default_confidence_engine` for their own confidence fields rather
than scoring independently — one scoring algorithm, reused everywhere
"confidence" is reported, so a 0.7 means the same thing in a unified
response as it does in an explainability report.

No LLM call, no engine/service import — every factor is derived purely
from the :class:`~src.ai.agents.base.AgentResult` list already produced
by the Supervisor.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from src.ai.agents.base import AgentResult
from src.ai.agents.compliance_agent import ComplianceAssessment
from src.ai.agents.emergency_categorization import EmergencyAssessment
from src.ai.agents.graph_knowledge_agent import GraphKnowledgeResult
from src.ai.confidence.schemas import ConfidenceBreakdown, ConfidenceFactor, ConfidenceLevel, ConfidenceResult

RISK_AGENT = "risk"
COMPLIANCE_AGENT = "compliance"
KNOWLEDGE_AGENT = "knowledge"
GRAPH_KNOWLEDGE_AGENT = "graph_knowledge"
EMERGENCY_AGENT = "emergency"

FACTOR_RISK_AGENT = "risk_agent"
FACTOR_RETRIEVAL_RELEVANCE = "retrieval_relevance"
FACTOR_KNOWLEDGE_GRAPH_MATCHES = "knowledge_graph_matches"
FACTOR_EMERGENCY_AGENT = "emergency_agent"
FACTOR_AGENT_CONSISTENCY = "agent_consistency"

_LOW_SIMILARITY_FLOOR = 0.3
"""Below this cosine similarity, a retrieved chunk counts as a weak match, not a confident one."""


# ── Configuration ─────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class ConfidenceEngineConfig:
    """Every tunable knob the engine uses — the "keep implementation configurable" contract.

    Attributes:
        factor_weights: Each factor's share of the overall score. Only
            factors with a signal for the current request (e.g. Risk
            didn't run) are included in the weighted average — weights
            need not sum to 1.0, they're renormalized over whichever
            factors are actually present (see
            :meth:`ConfidenceEngine.score`).
        level_thresholds: Minimum ``overall_score`` (inclusive) required
            for each :class:`~src.ai.confidence.schemas.ConfidenceLevel`,
            checked from highest to lowest. Must cover
            :class:`ConfidenceLevel.LOW` at ``0.0`` or lower so every
            score in ``[0, 1]`` lands somewhere.
        agent_consistency_enabled: Whether the agent-consistency factor
            participates at all. Off by default reduces to a 3-factor
            score; a deployment that finds "how many agents failed"
            noisy for single-agent requests can disable it without
            forking the engine.
    """

    factor_weights: dict[str, float] = field(
        default_factory=lambda: {
            FACTOR_RISK_AGENT: 1.0,
            FACTOR_RETRIEVAL_RELEVANCE: 1.0,
            FACTOR_KNOWLEDGE_GRAPH_MATCHES: 0.75,
            FACTOR_EMERGENCY_AGENT: 1.0,
            FACTOR_AGENT_CONSISTENCY: 1.0,
        }
    )
    level_thresholds: dict[ConfidenceLevel, float] = field(
        default_factory=lambda: {
            ConfidenceLevel.VERY_HIGH: 0.85,
            ConfidenceLevel.HIGH: 0.65,
            ConfidenceLevel.MEDIUM: 0.4,
            ConfidenceLevel.LOW: 0.0,
        }
    )
    agent_consistency_enabled: bool = True


# ── Engine ────────────────────────────────────────────────────────────────────


class ConfidenceEngine:
    """Computes :class:`~src.ai.confidence.schemas.ConfidenceResult` from a Supervisor run.

    Args:
        config: Weights and thresholds to use. Defaults to
            :class:`ConfidenceEngineConfig`'s own defaults — pass a
            custom config to tune per deployment without editing this
            module (e.g. weighting retrieval relevance higher for a
            compliance-heavy deployment).
    """

    def __init__(self, config: ConfidenceEngineConfig | None = None) -> None:
        self._config = config if config is not None else ConfidenceEngineConfig()

    def score(self, results: list[AgentResult]) -> ConfidenceResult:
        """Compute the overall confidence score, level, and breakdown for ``results``."""
        by_agent = {result.agent: result for result in results}

        raw_factors: list[tuple[str, float, str] | None] = [
            _risk_agent_factor(by_agent.get(RISK_AGENT)),
            _retrieval_relevance_factor(by_agent.get(KNOWLEDGE_AGENT), by_agent.get(COMPLIANCE_AGENT)),
            _knowledge_graph_matches_factor(by_agent.get(GRAPH_KNOWLEDGE_AGENT)),
            _emergency_agent_factor(by_agent.get(EMERGENCY_AGENT)),
            _agent_consistency_factor(results) if self._config.agent_consistency_enabled else None,
        ]
        present = [f for f in raw_factors if f is not None]

        if not present:
            return ConfidenceResult(
                overall_score=0.0,
                confidence_level=_level_for(0.0, self._config.level_thresholds),
                breakdown=ConfidenceBreakdown(factors=()),
            )

        total_weight = sum(self._config.factor_weights.get(name, 0.0) for name, _, _ in present) or 1.0
        factors = tuple(
            ConfidenceFactor(
                name=name,
                score=score,
                weight=round(self._config.factor_weights.get(name, 0.0) / total_weight, 4),
                detail=detail,
            )
            for name, score, detail in present
        )
        overall = round(sum(f.score * f.weight for f in factors), 2)

        return ConfidenceResult(
            overall_score=overall,
            confidence_level=_level_for(overall, self._config.level_thresholds),
            breakdown=ConfidenceBreakdown(factors=factors),
        )


def default_confidence_engine() -> ConfidenceEngine:
    """The engine every caller should use unless it has a deployment-specific reason not to.

    A function (not a module-level singleton) so each call gets a fresh
    :class:`ConfidenceEngineConfig` — the config is immutable and cheap
    to build, and this avoids any caller accidentally mutating shared
    state across requests.
    """
    return ConfidenceEngine()


# ── Factor computation ───────────────────────────────────────────────────────
#
# Each function returns ``(factor_name, score, detail)`` or ``None`` if
# the factor has no signal for this request (its agent didn't run) —
# ``None`` factors are excluded from both the numerator and denominator
# of the weighted average, so a request that never needed the Risk agent
# isn't penalized for lacking a risk score.


def _risk_agent_factor(risk_result: AgentResult | None) -> tuple[str, float, str] | None:
    if risk_result is None:
        return None
    if not risk_result.ok:
        return FACTOR_RISK_AGENT, 0.0, f"Risk agent failed: {risk_result.error}"
    if risk_result.data is None:
        return FACTOR_RISK_AGENT, 0.5, "Risk agent returned no data."
    zone_count = len(risk_result.data)
    if zone_count == 0:
        return FACTOR_RISK_AGENT, 0.9, "Risk agent ran; no compound risk zones found (a confident negative)."
    return FACTOR_RISK_AGENT, 1.0, f"Risk agent assessed {zone_count} zone(s)."


def _retrieval_relevance_factor(
    knowledge_result: AgentResult | None, compliance_result: AgentResult | None
) -> tuple[str, float, str] | None:
    """Averages Knowledge's chunk similarity scores with Compliance's match-presence signal.

    Knowledge agent chunks carry a real cosine ``similarity`` score
    (``src.services.rag.schemas.RetrievedChunk``); Compliance's
    ``ComplianceAssessment`` doesn't expose one (see that dataclass), so
    it falls back to "did we find any matching regulations at all" —
    the same proxy ``response_aggregator``'s prior scorer used. If both
    ran, their scores are averaged; if only one ran, that one's score is
    used alone.
    """
    sub_scores: list[float] = []
    details: list[str] = []

    if knowledge_result is not None:
        if not knowledge_result.ok:
            sub_scores.append(0.0)
            details.append(f"Knowledge agent failed: {knowledge_result.error}")
        elif not knowledge_result.data:
            sub_scores.append(0.3)
            details.append("Knowledge agent found no relevant chunks.")
        else:
            chunks = knowledge_result.data
            similarities = [s for c in chunks if (s := getattr(c, "similarity", None)) is not None]
            if similarities:
                avg = sum(similarities) / len(similarities)
                score = 0.3 if avg < _LOW_SIMILARITY_FLOOR else min(1.0, avg)
                sub_scores.append(score)
                details.append(f"Knowledge: avg similarity {avg:.2f} across {len(similarities)} chunk(s).")
            else:
                sub_scores.append(0.8)
                details.append(f"Knowledge: {len(chunks)} chunk(s) found (no similarity ranking available).")

    if compliance_result is not None:
        if not compliance_result.ok:
            sub_scores.append(0.0)
            details.append(f"Compliance agent failed: {compliance_result.error}")
        elif not isinstance(compliance_result.data, ComplianceAssessment):
            sub_scores.append(0.0)
            details.append("Compliance agent returned an unrecognized result shape.")
        elif compliance_result.data.relevant_regulations:
            sub_scores.append(1.0)
            details.append(f"Compliance: {len(compliance_result.data.relevant_regulations)} regulation(s) matched.")
        else:
            sub_scores.append(0.3)
            details.append("Compliance agent found no matching regulations.")

    if not sub_scores:
        return None
    return FACTOR_RETRIEVAL_RELEVANCE, round(sum(sub_scores) / len(sub_scores), 2), " ".join(details)


def _knowledge_graph_matches_factor(graph_result: AgentResult | None) -> tuple[str, float, str] | None:
    if graph_result is None:
        return None
    if not graph_result.ok:
        return FACTOR_KNOWLEDGE_GRAPH_MATCHES, 0.0, f"Graph Knowledge agent failed: {graph_result.error}"
    if not isinstance(graph_result.data, GraphKnowledgeResult):
        return FACTOR_KNOWLEDGE_GRAPH_MATCHES, 0.0, "Graph Knowledge agent returned an unrecognized result shape."

    count = graph_result.data.total_count
    if count == 0:
        return FACTOR_KNOWLEDGE_GRAPH_MATCHES, 0.3, "No relevant graph relationships found."
    # More matches -> more corroborating structure, but with diminishing
    # returns past a handful — 5+ matches is already a strong signal.
    score = min(1.0, 0.5 + 0.1 * count)
    return FACTOR_KNOWLEDGE_GRAPH_MATCHES, round(score, 2), f"{count} graph relationship(s) matched."


def _emergency_agent_factor(emergency_result: AgentResult | None) -> tuple[str, float, str] | None:
    """Mirrors :func:`_risk_agent_factor`'s shape — a dedicated, full-weight factor.

    Deliberately not folded into :func:`_agent_consistency_factor`: a
    failed Emergency agent is a safety-critical failure (no dispatched
    actions for zones under compound risk) and must visibly lower
    ``overall_score`` on its own, not just nudge the generic pass/fail
    ratio down by one vote among however many agents happened to run.
    """
    if emergency_result is None:
        return None
    if not emergency_result.ok:
        return FACTOR_EMERGENCY_AGENT, 0.0, f"Emergency agent failed: {emergency_result.error}"
    if not isinstance(emergency_result.data, EmergencyAssessment):
        return FACTOR_EMERGENCY_AGENT, 0.5, "Emergency agent returned no data."

    dispatched = (
        len(emergency_result.data.immediate_actions)
        + len(emergency_result.data.notifications)
        + len(emergency_result.data.incident_workflow)
    )
    if dispatched == 0:
        return FACTOR_EMERGENCY_AGENT, 0.9, "Emergency agent ran; no actions required (a confident negative)."
    return FACTOR_EMERGENCY_AGENT, 1.0, f"Emergency agent dispatched {dispatched} action(s)."


def _agent_consistency_factor(results: list[AgentResult]) -> tuple[str, float, str] | None:
    """How much the executed agents agree, proxied as the fraction that succeeded.

    A run where every agent that was asked to contribute actually
    produced a usable result is more trustworthy than one where several
    failed, independent of what any single agent's own score was — this
    is a cross-agent signal, not a per-agent one, which is why it's
    computed over ``results`` as a whole rather than one ``AgentResult``.
    """
    if not results:
        return None
    ok_count = sum(1 for r in results if r.ok)
    score = round(ok_count / len(results), 2)
    return FACTOR_AGENT_CONSISTENCY, score, f"{ok_count}/{len(results)} executed agent(s) succeeded."


def _level_for(score: float, thresholds: dict[ConfidenceLevel, float]) -> ConfidenceLevel:
    for level in (ConfidenceLevel.VERY_HIGH, ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM, ConfidenceLevel.LOW):
        if score >= thresholds.get(level, 0.0):
            return level
    return ConfidenceLevel.LOW
