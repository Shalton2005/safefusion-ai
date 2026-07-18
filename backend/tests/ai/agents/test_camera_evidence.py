"""Tests for camera evidence enrichment used by the Explainability Service."""

from __future__ import annotations

from src.ai.agents.camera_evidence import (
    PPE_COMPLIANCE_RULE_CODE,
    build_camera_evidence,
)
from src.models.enums import RiskLevel
from src.services.compound_risk.schemas import CompoundRiskRuleMatch, ZoneCompoundRiskResult


def _zone_result(zone: str, matches: list[CompoundRiskRuleMatch]) -> ZoneCompoundRiskResult:
    return ZoneCompoundRiskResult(
        zone=zone,
        risk_score=sum(m.points for m in matches),
        risk_level=RiskLevel.MEDIUM,
        triggered_rules=matches,
    )


class TestBuildCameraEvidence:
    def test_empty_input_produces_no_evidence(self) -> None:
        section = build_camera_evidence([])
        assert section.has_camera_evidence is False
        assert section.items == ()

    def test_non_camera_rule_is_excluded(self) -> None:
        match = CompoundRiskRuleMatch(
            rule_name="critical_sensor_without_active_permit", points=35.0, explanation="sensor issue"
        )
        section = build_camera_evidence([_zone_result("Zone-A", [match])])
        assert section.has_camera_evidence is False

    def test_camera_rule_produces_one_evidence_item(self) -> None:
        match = CompoundRiskRuleMatch(
            rule_name="camera_critical_detection_without_active_permit",
            points=35.0,
            explanation="Zone 'Zone-A' has 1 critical camera/PPE finding(s) with no valid active permit.",
            evidence={"camera_severity_counts": {"critical": 1}},
        )
        section = build_camera_evidence([_zone_result("Zone-A", [match])])

        assert section.has_camera_evidence is True
        assert len(section.items) == 1
        item = section.items[0]
        assert item.zone == "Zone-A"
        assert item.rule_name == "camera_critical_detection_without_active_permit"
        assert item.related_regulation == PPE_COMPLIANCE_RULE_CODE
        assert item.reason_for_escalation == match.explanation

    def test_detection_confidence_prefers_explicit_evidence_field(self) -> None:
        match = CompoundRiskRuleMatch(
            rule_name="ppe_violation_with_worker_present",
            points=20.0,
            explanation="worker exposed to PPE violation",
            evidence={"detection_confidence": 0.77},
            confidence=1.0,
        )
        section = build_camera_evidence([_zone_result("Zone-B", [match])])
        assert section.items[0].detection_confidence == 0.77

    def test_detection_confidence_falls_back_to_camera_events_max_confidence(self) -> None:
        match = CompoundRiskRuleMatch(
            rule_name="ppe_violation_with_worker_present",
            points=20.0,
            explanation="worker exposed to PPE violation",
            evidence={"camera_events": [{"confidence": 0.6}, {"confidence": 0.9}]},
            confidence=1.0,
        )
        section = build_camera_evidence([_zone_result("Zone-B", [match])])
        assert section.items[0].detection_confidence == 0.9

    def test_detection_confidence_falls_back_to_match_confidence(self) -> None:
        match = CompoundRiskRuleMatch(
            rule_name="ppe_violation_with_worker_present",
            points=20.0,
            explanation="worker exposed to PPE violation",
            confidence=0.5,
        )
        section = build_camera_evidence([_zone_result("Zone-B", [match])])
        assert section.items[0].detection_confidence == 0.5

    def test_multiple_zones_and_mixed_rules_only_extracts_camera_rules(self) -> None:
        camera_match = CompoundRiskRuleMatch(
            rule_name="camera_critical_detection_without_active_permit", points=35.0, explanation="camera issue"
        )
        sensor_match = CompoundRiskRuleMatch(
            rule_name="critical_sensor_with_worker_present", points=40.0, explanation="sensor issue"
        )
        section = build_camera_evidence(
            [
                _zone_result("Zone-A", [camera_match, sensor_match]),
                _zone_result("Zone-B", [sensor_match]),
            ]
        )
        assert len(section.items) == 1
        assert section.items[0].zone == "Zone-A"
