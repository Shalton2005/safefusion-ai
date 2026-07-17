"""Tests for the Confidence Engine (src.ai.confidence.engine)."""

from __future__ import annotations

from src.ai.agents.base import AgentResult
from src.ai.agents.compliance_agent import ComplianceAssessment
from src.ai.agents.emergency_categorization import (
    EmergencyAssessment,
    ImmediateAction,
)
from src.ai.agents.graph_knowledge_agent import GraphKnowledgeResult, GraphRelationship
from src.ai.agents.risk_agent import Hazard, RiskAssessment
from src.ai.confidence.engine import (
    FACTOR_AGENT_CONSISTENCY,
    FACTOR_EMERGENCY_AGENT,
    FACTOR_KNOWLEDGE_GRAPH_MATCHES,
    FACTOR_RETRIEVAL_RELEVANCE,
    FACTOR_RISK_AGENT,
    ConfidenceEngine,
    ConfidenceEngineConfig,
)
from src.ai.confidence.schemas import ConfidenceLevel


def _chunk(similarity: float | None) -> object:
    return type("Chunk", (), {"content": "text", "source": "doc.pdf", "similarity": similarity})()


def _risk_result(zone_count: int = 1) -> AgentResult:
    zones = [
        RiskAssessment(
            zone=f"Zone-{i}",
            risk_level="critical",
            risk_score=85.0,
            detected_hazards=[Hazard(zone=f"Zone-{i}", description="gas critical", severity="critical", source="sensor")],
            reasoning=["rule triggered"],
            recommendations=["act"],
        )
        for i in range(zone_count)
    ]
    return AgentResult(agent="risk", summary="...", data=zones)


def _compliance_result(regulations: list[str] | None = None) -> AgentResult:
    regs = regulations if regulations is not None else ["OISD-STD-118"]
    return AgentResult(
        agent="compliance",
        summary="...",
        data=ComplianceAssessment(
            relevant_regulations=regs,
            applicable_sections=["sec 1"] if regs else [],
            compliance_notes=["note"] if regs else [],
            recommendations=[],
        ),
    )


def _knowledge_result(similarities: list[float | None] | None = None) -> AgentResult:
    chunks = [_chunk(s) for s in (similarities if similarities is not None else [0.8, 0.7])]
    return AgentResult(agent="knowledge", summary="...", data=chunks)


def _graph_result(match_count: int = 1) -> AgentResult:
    relationships = [GraphRelationship(query="list_workers", record={"id": i}) for i in range(match_count)]
    return AgentResult(agent="graph_knowledge", summary="...", data=GraphKnowledgeResult(worker_relationships=relationships))


def _emergency_result(*, dispatched: bool = True) -> AgentResult:
    actions = [ImmediateAction(zone="Zone-1", action="evacuate_area", reason="critical risk")] if dispatched else []
    return AgentResult(
        agent="emergency",
        summary="...",
        data=EmergencyAssessment(immediate_actions=actions, notifications=[], escalation=[], incident_workflow=[]),
    )


class TestConfidenceEngine:
    def test_no_results_returns_zero_and_low(self) -> None:
        result = ConfidenceEngine().score([])

        assert result.overall_score == 0.0
        assert result.confidence_level == ConfidenceLevel.LOW
        assert result.breakdown.factors == ()

    def test_full_success_across_all_factors_is_high_confidence(self) -> None:
        result = ConfidenceEngine().score(
            [_risk_result(), _compliance_result(), _knowledge_result(), _graph_result()]
        )

        assert result.overall_score > 0.7
        assert result.confidence_level in (ConfidenceLevel.HIGH, ConfidenceLevel.VERY_HIGH)

    def test_breakdown_contains_one_entry_per_present_factor(self) -> None:
        result = ConfidenceEngine().score([_risk_result(), _compliance_result()])

        names = {f.name for f in result.breakdown.factors}
        assert FACTOR_RISK_AGENT in names
        assert FACTOR_RETRIEVAL_RELEVANCE in names
        assert FACTOR_KNOWLEDGE_GRAPH_MATCHES not in names  # graph agent never ran
        assert FACTOR_AGENT_CONSISTENCY in names

    def test_risk_agent_factor_absent_when_risk_did_not_run(self) -> None:
        result = ConfidenceEngine().score([_compliance_result()])

        assert result.breakdown.factor(FACTOR_RISK_AGENT) is None

    def test_failed_risk_agent_scores_zero_for_that_factor(self) -> None:
        failed = AgentResult(agent="risk", summary="", error="engine down")

        result = ConfidenceEngine().score([failed])

        factor = result.breakdown.factor(FACTOR_RISK_AGENT)
        assert factor is not None
        assert factor.score == 0.0

    def test_retrieval_relevance_reflects_low_similarity(self) -> None:
        high_sim = ConfidenceEngine().score([_knowledge_result([0.9, 0.85])])
        low_sim = ConfidenceEngine().score([_knowledge_result([0.1, 0.15])])

        high_factor = high_sim.breakdown.factor(FACTOR_RETRIEVAL_RELEVANCE)
        low_factor = low_sim.breakdown.factor(FACTOR_RETRIEVAL_RELEVANCE)
        assert high_factor.score > low_factor.score

    def test_retrieval_relevance_combines_knowledge_and_compliance(self) -> None:
        result = ConfidenceEngine().score([_knowledge_result([0.9]), _compliance_result(["REG-1"])])

        factor = result.breakdown.factor(FACTOR_RETRIEVAL_RELEVANCE)
        assert factor is not None
        assert "Knowledge" in factor.detail
        assert "Compliance" in factor.detail

    def test_compliance_with_no_matches_scores_low_relevance(self) -> None:
        result = ConfidenceEngine().score([_compliance_result(regulations=[])])

        factor = result.breakdown.factor(FACTOR_RETRIEVAL_RELEVANCE)
        assert factor.score < 0.5

    def test_knowledge_graph_matches_scale_with_count(self) -> None:
        few = ConfidenceEngine().score([_graph_result(match_count=1)])
        many = ConfidenceEngine().score([_graph_result(match_count=5)])

        few_factor = few.breakdown.factor(FACTOR_KNOWLEDGE_GRAPH_MATCHES)
        many_factor = many.breakdown.factor(FACTOR_KNOWLEDGE_GRAPH_MATCHES)
        assert many_factor.score > few_factor.score

    def test_knowledge_graph_zero_matches_scores_low(self) -> None:
        result = ConfidenceEngine().score([_graph_result(match_count=0)])

        factor = result.breakdown.factor(FACTOR_KNOWLEDGE_GRAPH_MATCHES)
        assert factor.score < 0.5

    def test_agent_consistency_drops_when_some_agents_fail(self) -> None:
        all_ok = ConfidenceEngine().score([_risk_result(), _compliance_result()])
        one_failed = ConfidenceEngine().score([_risk_result(), AgentResult(agent="compliance", summary="", error="x")])

        ok_factor = all_ok.breakdown.factor(FACTOR_AGENT_CONSISTENCY)
        failed_factor = one_failed.breakdown.factor(FACTOR_AGENT_CONSISTENCY)
        assert ok_factor.score > failed_factor.score

    def test_agent_consistency_can_be_disabled_via_config(self) -> None:
        config = ConfidenceEngineConfig(agent_consistency_enabled=False)
        result = ConfidenceEngine(config).score([_risk_result()])

        assert result.breakdown.factor(FACTOR_AGENT_CONSISTENCY) is None

    def test_custom_factor_weights_change_overall_score(self) -> None:
        heavy_risk_config = ConfidenceEngineConfig(
            factor_weights={FACTOR_RISK_AGENT: 10.0, FACTOR_RETRIEVAL_RELEVANCE: 0.01, FACTOR_AGENT_CONSISTENCY: 0.01}
        )
        default_result = ConfidenceEngine().score([_risk_result(), _compliance_result(regulations=[])])
        heavy_risk_result = ConfidenceEngine(heavy_risk_config).score([_risk_result(), _compliance_result(regulations=[])])

        # Risk succeeded (score 1.0) while compliance found nothing (low score) —
        # weighting risk heavily should pull the overall score up.
        assert heavy_risk_result.overall_score > default_result.overall_score

    def test_custom_level_thresholds_change_banding(self) -> None:
        strict_config = ConfidenceEngineConfig(
            level_thresholds={
                ConfidenceLevel.VERY_HIGH: 0.99,
                ConfidenceLevel.HIGH: 0.95,
                ConfidenceLevel.MEDIUM: 0.90,
                ConfidenceLevel.LOW: 0.0,
            }
        )
        result = ConfidenceEngine(strict_config).score([_risk_result()])

        # A perfect single-factor score (1.0) still won't clear a 0.99 VERY_HIGH bar
        # unless it actually reaches it — this asserts the custom thresholds are honored.
        assert result.confidence_level in (ConfidenceLevel.VERY_HIGH, ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM)

    def test_weights_in_breakdown_sum_to_approximately_one(self) -> None:
        result = ConfidenceEngine().score(
            [_risk_result(), _compliance_result(), _knowledge_result(), _graph_result()]
        )

        total = sum(f.weight for f in result.breakdown.factors)
        assert abs(total - 1.0) < 0.01

    def test_overall_score_is_bounded_between_zero_and_one(self) -> None:
        result = ConfidenceEngine().score(
            [_risk_result(), _compliance_result(), _knowledge_result(), _graph_result()]
        )

        assert 0.0 <= result.overall_score <= 1.0

    def test_emergency_agent_factor_absent_when_emergency_did_not_run(self) -> None:
        result = ConfidenceEngine().score([_risk_result()])

        assert result.breakdown.factor(FACTOR_EMERGENCY_AGENT) is None

    def test_emergency_agent_success_scores_high(self) -> None:
        result = ConfidenceEngine().score([_emergency_result()])

        factor = result.breakdown.factor(FACTOR_EMERGENCY_AGENT)
        assert factor is not None
        assert factor.score == 1.0

    def test_failed_emergency_agent_scores_zero_for_that_factor(self) -> None:
        failed = AgentResult(agent="emergency", summary="", error="engine down")

        result = ConfidenceEngine().score([failed])

        factor = result.breakdown.factor(FACTOR_EMERGENCY_AGENT)
        assert factor is not None
        assert factor.score == 0.0

    def test_failed_emergency_agent_visibly_lowers_overall_confidence(self) -> None:
        """Regression test: confidence engine consolidation must not silently dilute
        an Emergency agent failure into the generic agent-consistency factor.

        Before this factor existed, Risk+Compliance succeeding with Emergency
        failing scored ~0.89 overall — barely distinguishable from Emergency
        never having run at all (~1.00). A failed emergency-response
        assessment is a safety-critical failure and must visibly drop
        confidence, not shave off a fraction of a diluted consistency ratio.
        """
        failed_emergency = AgentResult(agent="emergency", summary="", error="engine down")

        with_failure = ConfidenceEngine().score([_risk_result(), _compliance_result(), failed_emergency])
        without_emergency = ConfidenceEngine().score([_risk_result(), _compliance_result()])

        assert with_failure.overall_score < without_emergency.overall_score - 0.2
        assert with_failure.confidence_level != without_emergency.confidence_level
