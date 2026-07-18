"""Tests for the Explainability Service (src.ai.agents.explainability_service)."""

from __future__ import annotations

import json

from src.ai.agents.base import AgentResult
from src.ai.agents.compliance_agent import ComplianceAssessment
from src.ai.agents.explainability_service import explain
from src.ai.agents.graph_knowledge_agent import GraphKnowledgeResult, GraphRelationship
from src.ai.agents.risk_agent import Hazard, RiskAssessment
from src.models.enums import RiskLevel
from src.services.compound_risk.schemas import CompoundRiskRuleMatch, ZoneCompoundRiskResult


def _risk_result(zone: str = "Boiler-Area", score: float = 85.0) -> AgentResult:
    return AgentResult(
        agent="risk",
        summary=f"Compound risk detected in 1 zone(s): {zone}: critical ({score:.0f})",
        data=[
            RiskAssessment(
                zone=zone,
                risk_level="critical",
                risk_score=score,
                detected_hazards=[Hazard(zone=zone, description="gas reading critical", severity="critical", source="sensor")],
                reasoning=["critical_sensor_without_active_permit triggered"],
                recommendations=["Issue or verify an active permit."],
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
            recommendations=["Review OISD-STD-118."],
        ),
        citations=("OISD-STD-118",),
    )


def _knowledge_result() -> AgentResult:
    chunk = type("Chunk", (), {"content": "General safety procedure text.", "source": "safety_manual.pdf"})()
    return AgentResult(agent="knowledge", summary="Found 1 relevant document chunk(s) across 1 source(s).", data=[chunk], citations=("safety_manual.pdf",))


def _graph_result() -> AgentResult:
    return AgentResult(
        agent="graph_knowledge",
        summary="Found 1 relevant relationship(s): 1 worker, 0 equipment, 0 zone, 0 incident.",
        data=GraphKnowledgeResult(
            worker_relationships=[GraphRelationship(query="workers_by_zone", record={"worker_id": "W1", "zone": "Boiler-Area"})],
        ),
    )


class TestExplain:
    def test_empty_results_returns_defaults(self) -> None:
        report = explain([])

        assert report.summary == "No agents were run for this request."
        assert report.evidence_used == ()
        assert report.graph_relationships == ()
        assert report.retrieved_regulations == ()
        assert report.agent_contributions == ()
        assert report.confidence == 0.0

    def test_combines_all_sections(self) -> None:
        report = explain([_risk_result(), _compliance_result(), _knowledge_result(), _graph_result()])

        assert "Boiler-Area" in report.summary
        assert any(item.source_agent == "compliance" for item in report.evidence_used)
        assert any(item.source_agent == "knowledge" for item in report.evidence_used)
        assert report.graph_relationships[0].category == "worker"
        assert report.graph_relationships[0].record["worker_id"] == "W1"
        assert report.retrieved_regulations[0].regulation == "OISD-STD-118"
        assert len(report.agent_contributions) == 4
        assert report.confidence > 0.0

    def test_failed_agent_contributes_zero_score_but_is_listed(self) -> None:
        failed = AgentResult(agent="knowledge", summary="", error="RAG timeout")

        report = explain([_risk_result(), failed])

        contribution = next(c for c in report.agent_contributions if c.agent == "knowledge")
        assert contribution.ok is False
        assert contribution.error == "RAG timeout"
        assert "knowledge agent failed: RAG timeout" in report.summary

    def test_agent_contribution_weights_sum_to_one(self) -> None:
        report = explain([_risk_result(), _compliance_result(), _knowledge_result(), _graph_result()])

        total_weight = sum(c.weight for c in report.agent_contributions)
        assert round(total_weight, 6) == 1.0

    def test_graph_relationships_empty_when_agent_absent(self) -> None:
        report = explain([_risk_result(), _compliance_result()])

        assert report.graph_relationships == ()

    def test_to_dict_and_to_json_round_trip(self) -> None:
        report = explain([_risk_result(), _compliance_result(), _graph_result()])

        as_dict = report.to_dict()
        assert as_dict["confidence"] == report.confidence
        assert len(as_dict["graph_relationships"]) == 1

        as_json = report.to_json()
        parsed = json.loads(as_json)
        assert parsed["graph_relationships"] == [dict(item) for item in as_dict["graph_relationships"]]
        assert parsed["confidence"] == as_dict["confidence"]

    def test_confidence_ignores_agents_that_never_ran(self) -> None:
        only_risk = explain([_risk_result()])

        assert only_risk.confidence == 1.0

    def test_no_agents_run_returns_zero_confidence(self) -> None:
        report = explain([])

        assert report.confidence == 0.0

    def test_camera_evidence_defaults_to_empty_when_not_supplied(self) -> None:
        """Backward compatibility: existing explain(results) callers are unaffected."""
        report = explain([_risk_result()])

        assert report.camera_evidence.has_camera_evidence is False
        assert report.camera_evidence.items == ()

    def test_camera_evidence_populated_from_zone_compound_risk_results(self) -> None:
        camera_match = CompoundRiskRuleMatch(
            rule_name="camera_critical_detection_without_active_permit",
            points=35.0,
            explanation="Zone 'Boiler-Area' has 1 critical camera/PPE finding(s) with no valid active permit.",
            evidence={"camera_severity_counts": {"critical": 1}},
        )
        zone_result = ZoneCompoundRiskResult(
            zone="Boiler-Area", risk_score=35.0, risk_level=RiskLevel.MEDIUM, triggered_rules=[camera_match]
        )

        report = explain([_risk_result()], zone_compound_risk_results=[zone_result])

        assert report.camera_evidence.has_camera_evidence is True
        item = report.camera_evidence.items[0]
        assert item.zone == "Boiler-Area"
        assert item.related_regulation == "factory_act_ppe_compliance"

    def test_camera_evidence_serializes_in_to_dict_and_to_json(self) -> None:
        camera_match = CompoundRiskRuleMatch(
            rule_name="ppe_violation_with_worker_present", points=20.0, explanation="worker exposed"
        )
        zone_result = ZoneCompoundRiskResult(
            zone="Zone-A", risk_score=20.0, risk_level=RiskLevel.LOW, triggered_rules=[camera_match]
        )
        report = explain([], zone_compound_risk_results=[zone_result])

        as_dict = report.to_dict()
        assert as_dict["camera_evidence"]["items"][0]["zone"] == "Zone-A"

        parsed = json.loads(report.to_json())
        assert parsed["camera_evidence"]["items"][0]["rule_name"] == "ppe_violation_with_worker_present"
