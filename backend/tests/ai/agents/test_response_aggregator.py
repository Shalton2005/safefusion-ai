"""Tests for the Response Aggregator (src.ai.agents.response_aggregator)."""

from __future__ import annotations

from src.ai.agents.base import AgentResult
from src.ai.agents.compliance_agent import ComplianceAssessment
from src.ai.agents.emergency_categorization import (
    Escalation,
    EmergencyAssessment,
    ImmediateAction,
    IncidentWorkflowStep,
    Notification,
)
from src.ai.agents.response_aggregator import aggregate
from src.ai.agents.risk_agent import Hazard, RiskAssessment


def _risk_result(zone: str = "Boiler-Area", score: float = 85.0) -> AgentResult:
    return AgentResult(
        agent="risk",
        summary=f"Compound risk detected in 1 zone(s): {zone}: critical ({score:.0f})",
        data=[
            RiskAssessment(
                zone=zone,
                risk_level="critical",
                risk_score=score,
                detected_hazards=[
                    Hazard(zone=zone, description="gas reading of 900ppm is critical", severity="critical", source="sensor")
                ],
                reasoning=["critical_sensor_without_active_permit triggered"],
                recommendations=["Issue or verify an active permit for the zone, or stop work until one is in place."],
            )
        ],
    )


def _compliance_result() -> AgentResult:
    return AgentResult(
        agent="compliance",
        summary="Found 1 applicable section(s) across 1 regulation(s).",
        data=ComplianceAssessment(
            relevant_regulations=["OISD-STD-118"],
            applicable_sections=["OISD-STD-118 (section 3)"],
            compliance_notes=["Permit to work required for hot work in hazardous zones."],
            recommendations=["Review OISD-STD-118 before proceeding — it was matched as relevant to this request."],
        ),
        citations=("OISD-STD-118",),
    )


def _emergency_result(zone: str = "Boiler-Area") -> AgentResult:
    return AgentResult(
        agent="emergency",
        summary="Emergency response for 1 zone(s): 1 immediate action(s).",
        data=EmergencyAssessment(
            immediate_actions=[ImmediateAction(zone=zone, action="evacuate_area", reason="critical gas reading")],
            notifications=[Notification(zone=zone, recipient="safety_officer", action="notify_safety_officer", reason="critical risk")],
            escalation=[Escalation(zone=zone, risk_level="critical", risk_score=85.0, tier="executive_and_regulatory", reason="critical risk score")],
            incident_workflow=[IncidentWorkflowStep(zone=zone, action="generate_incident", reason="critical risk score")],
        ),
    )


class TestAggregate:
    def test_empty_results_returns_defaults(self) -> None:
        unified = aggregate([])

        assert unified.executive_summary == "No agents were run for this request."
        assert unified.risk_assessment == ()
        assert unified.supporting_evidence == ()
        assert unified.regulatory_references == ()
        assert unified.recommended_actions == ()
        assert unified.confidence_score == 0.0
        assert unified.agent_errors == {}

    def test_combines_all_four_agents_into_six_sections(self) -> None:
        results = [_risk_result(), _compliance_result(), _emergency_result()]

        unified = aggregate(results)

        assert "Boiler-Area" in unified.executive_summary
        assert len(unified.risk_assessment) == 1
        assert unified.risk_assessment[0].zone == "Boiler-Area"
        assert unified.risk_assessment[0].risk_level == "critical"
        assert "Permit to work required for hot work in hazardous zones." in unified.supporting_evidence
        assert unified.regulatory_references == ("OISD-STD-118",)
        assert any("evacuate_area" in action for action in unified.recommended_actions)
        assert any("Issue or verify an active permit" in action for action in unified.recommended_actions)
        assert any("Review OISD-STD-118" in action for action in unified.recommended_actions)
        assert unified.agent_errors == {}

    def test_emergency_actions_come_before_risk_and_compliance_recommendations(self) -> None:
        unified = aggregate([_risk_result(), _compliance_result(), _emergency_result()])

        emergency_idx = next(i for i, a in enumerate(unified.recommended_actions) if "evacuate_area" in a)
        risk_idx = next(i for i, a in enumerate(unified.recommended_actions) if "Issue or verify" in a)
        compliance_idx = next(i for i, a in enumerate(unified.recommended_actions) if "Review OISD" in a)

        assert emergency_idx < risk_idx < compliance_idx

    def test_failed_agent_excluded_from_sections_but_reported_in_errors(self) -> None:
        failed_knowledge = AgentResult(agent="knowledge", summary="", error="RAG service timeout")

        unified = aggregate([_risk_result(), failed_knowledge])

        assert unified.agent_errors == {"knowledge": "RAG service timeout"}
        assert "knowledge agent failed: RAG service timeout" in unified.executive_summary
        # Risk section still populated despite Knowledge failing.
        assert len(unified.risk_assessment) == 1

    def test_one_agent_only_still_produces_valid_response(self) -> None:
        unified = aggregate([_risk_result()])

        assert unified.risk_assessment
        assert unified.supporting_evidence == ()
        assert unified.regulatory_references == ()
        assert unified.confidence_score > 0.0

    def test_recommended_actions_are_deduplicated(self) -> None:
        risk_a = _risk_result(zone="Zone-A")
        risk_b = AgentResult(
            agent="risk",
            summary="dup",
            data=[
                *risk_a.data,
                RiskAssessment(
                    zone="Zone-B",
                    risk_level="critical",
                    risk_score=85.0,
                    detected_hazards=[],
                    reasoning=["same rule triggered"],
                    recommendations=["Issue or verify an active permit for the zone, or stop work until one is in place."],
                ),
            ],
        )

        unified = aggregate([risk_b])

        matches = [a for a in unified.recommended_actions if "Issue or verify an active permit" in a]
        assert len(matches) == 1

    def test_confidence_score_drops_when_an_agent_fails(self) -> None:
        all_ok = aggregate([_risk_result(), _compliance_result(), _emergency_result()])
        one_failed = aggregate(
            [_risk_result(), _compliance_result(), AgentResult(agent="emergency", summary="", error="engine down")]
        )

        assert one_failed.confidence_score < all_ok.confidence_score

    def test_confidence_score_ignores_agents_that_never_ran(self) -> None:
        only_risk = aggregate([_risk_result()])

        # Risk alone succeeding should be high confidence, not penalized
        # for compliance/knowledge/emergency never having run.
        assert only_risk.confidence_score == 1.0
