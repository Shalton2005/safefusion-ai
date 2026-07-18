"""Tests for the Compound Risk Detection service."""

from __future__ import annotations

import pytest

from src.models.enums import RiskLevel
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.compound_risk.engine import CompoundRiskEngine
from src.services.compound_risk.rules import (
    CameraCriticalDetectionWithoutActivePermitRule,
    CriticalSensorNearDegradedEquipmentRule,
    CriticalSensorWithoutActivePermitRule,
    CriticalSensorWithWorkerPresentRule,
    DegradedEquipmentWithWorkerPresentRule,
    ExpiredPermitWithWorkerPresentRule,
    MultipleWarningSensorsRule,
    PPEViolationWithWorkerPresentRule,
    RestrictedZoneWithoutActivePermitRule,
)
from src.services.compound_risk.schemas import CompoundRiskLevelBands, CompoundRiskRuleMatch


def _sensor_summary(zone: str, status: str, count: int = 1) -> dict:
    return {"sensors": [{"zone": zone, "computed_status": status} for _ in range(count)]}


def _permit_summary(zone: str, state: str) -> dict:
    return {"permits": [{"zone": zone, "validation_state": state}]}


def _worker_summary(zone: str, count: int = 1) -> dict:
    return {"workers": [{"assigned_zone": zone} for _ in range(count)]}


def _maintenance_summary(equipment_id: str, health_status: str = "degraded") -> dict:
    return {
        "equipment": [
            {
                "equipment_id": equipment_id,
                "equipment_name": "Test Equipment",
                "total_logs": 3,
                "corrective_logs": 2,
                "corrective_ratio": 0.67,
                "has_ongoing_corrective": True,
                "health_status": health_status,
                "last_maintenance_at": None,
            }
        ]
    }


def _camera_summary(zone: str, severity: str = "critical", rule_name: str = "smoke_detected") -> dict:
    return {
        "events": [
            {
                "camera_id": "CAM-1",
                "zone": zone,
                "rule_name": rule_name,
                "label": "smoke",
                "severity": severity,
                "confidence": 0.9,
                "explanation": "test finding",
            }
        ]
    }


class TestCriticalSensorWithoutActivePermitRule:
    def test_fires_when_critical_and_no_valid_permit(self) -> None:
        rule = CriticalSensorWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-A", "critical"),
            permit_summary=_permit_summary("Zone-A", "expired"),
            worker_summary=None,
        )
        assert "Zone-A" in matches
        assert matches["Zone-A"].points == 35.0
        assert matches["Zone-A"].rule_name == "critical_sensor_without_active_permit"

    def test_does_not_fire_when_valid_permit_present(self) -> None:
        rule = CriticalSensorWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-A", "critical"),
            permit_summary=_permit_summary("Zone-A", "valid"),
            worker_summary=None,
        )
        assert matches == {}

    def test_does_not_fire_without_critical_reading(self) -> None:
        rule = CriticalSensorWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-A", "warning"),
            permit_summary=None,
            worker_summary=None,
        )
        assert matches == {}


class TestExpiredPermitWithWorkerPresentRule:
    def test_fires_when_expired_permit_and_worker_present(self) -> None:
        rule = ExpiredPermitWithWorkerPresentRule(points=30.0)
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=_permit_summary("Zone-B", "expired"),
            worker_summary=_worker_summary("Zone-B"),
        )
        assert "Zone-B" in matches
        assert matches["Zone-B"].points == 30.0

    def test_does_not_fire_without_worker(self) -> None:
        rule = ExpiredPermitWithWorkerPresentRule(points=30.0)
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=_permit_summary("Zone-B", "expired"),
            worker_summary=None,
        )
        assert matches == {}


class TestCriticalSensorWithWorkerPresentRule:
    def test_fires_when_both_present(self) -> None:
        rule = CriticalSensorWithWorkerPresentRule(points=40.0)
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-C", "critical"),
            permit_summary=None,
            worker_summary=_worker_summary("Zone-C", count=2),
        )
        assert "Zone-C" in matches
        assert "2 worker" in matches["Zone-C"].explanation


class TestRestrictedZoneWithoutActivePermitRule:
    def test_fires_for_worker_in_restricted_zone_without_permit(self) -> None:
        rule = RestrictedZoneWithoutActivePermitRule(points=30.0, restricted_zones={"Boiler-Area"})
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=_worker_summary("Boiler-Area"),
        )
        assert "Boiler-Area" in matches

    def test_does_not_fire_with_valid_permit(self) -> None:
        rule = RestrictedZoneWithoutActivePermitRule(points=30.0, restricted_zones={"Boiler-Area"})
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=_permit_summary("Boiler-Area", "valid"),
            worker_summary=_worker_summary("Boiler-Area"),
        )
        assert matches == {}

    def test_no_restricted_zones_configured(self) -> None:
        rule = RestrictedZoneWithoutActivePermitRule(points=30.0, restricted_zones=set())
        matches = rule.evaluate(
            sensor_summary=None, permit_summary=None, worker_summary=_worker_summary("Zone-X")
        )
        assert matches == {}


class TestMultipleWarningSensorsRule:
    def test_fires_at_threshold(self) -> None:
        rule = MultipleWarningSensorsRule(points=15.0, minimum_warning_count=2)
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-D", "warning", count=2),
            permit_summary=None,
            worker_summary=None,
        )
        assert "Zone-D" in matches

    def test_does_not_fire_below_threshold(self) -> None:
        rule = MultipleWarningSensorsRule(points=15.0, minimum_warning_count=2)
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-D", "warning", count=1),
            permit_summary=None,
            worker_summary=None,
        )
        assert matches == {}


class TestCompoundRiskEngine:
    def test_aggregates_multiple_rule_matches_for_same_zone(self) -> None:
        engine = CompoundRiskEngine(
            rules=[
                CriticalSensorWithoutActivePermitRule(points=35.0),
                CriticalSensorWithWorkerPresentRule(points=40.0),
            ],
            level_bands=CompoundRiskLevelBands(low_max=20.0, medium_max=45.0, high_max=70.0),
        )
        results = engine.evaluate(
            sensor_summary=_sensor_summary("Zone-E", "critical"),
            permit_summary=_permit_summary("Zone-E", "expired"),
            worker_summary=_worker_summary("Zone-E"),
        )
        assert len(results) == 1
        result = results[0]
        assert result.zone == "Zone-E"
        assert result.risk_score == 75.0
        assert result.risk_level == RiskLevel.CRITICAL
        assert len(result.triggered_rules) == 2
        assert "critical sensor" in result.explanation.lower()

    def test_score_clamped_to_100(self) -> None:
        engine = CompoundRiskEngine(
            rules=[
                CriticalSensorWithoutActivePermitRule(points=60.0),
                CriticalSensorWithWorkerPresentRule(points=60.0),
            ],
        )
        results = engine.evaluate(
            sensor_summary=_sensor_summary("Zone-F", "critical"),
            permit_summary=None,
            worker_summary=_worker_summary("Zone-F"),
        )
        assert results[0].risk_score == 100.0

    def test_no_matches_returns_empty_list(self) -> None:
        engine = CompoundRiskEngine(rules=[CriticalSensorWithoutActivePermitRule(points=35.0)])
        results = engine.evaluate(sensor_summary=None, permit_summary=None, worker_summary=None)
        assert results == []

    def test_results_sorted_by_score_descending(self) -> None:
        engine = CompoundRiskEngine(
            rules=[
                MultipleWarningSensorsRule(points=15.0, minimum_warning_count=1),
                CriticalSensorWithoutActivePermitRule(points=35.0),
            ]
        )
        sensor_summary = {
            "sensors": [
                {"zone": "Zone-Low", "computed_status": "warning"},
                {"zone": "Zone-High", "computed_status": "critical"},
            ]
        }
        results = engine.evaluate(sensor_summary=sensor_summary, permit_summary=None, worker_summary=None)
        assert [r.zone for r in results] == ["Zone-High", "Zone-Low"]


class _StubSensorMonitoring:
    def __init__(self, summary: dict | None) -> None:
        self._summary = summary

    def get_monitoring_summary(self) -> dict | None:
        return self._summary


class _StubWorkerMonitoring:
    def __init__(self, summary: dict | None) -> None:
        self._summary = summary

    def get_monitoring_summary(self) -> dict | None:
        return self._summary


class _StubPermitValidation:
    def __init__(self, summary: dict | None) -> None:
        self._summary = summary

    def get_validation_summary(self) -> dict | None:
        return self._summary


class _StubMaintenanceMonitoring:
    def __init__(self, summary: dict | None) -> None:
        self._summary = summary

    def get_monitoring_summary(self) -> dict | None:
        return self._summary


class _StubCameraMonitoring:
    def __init__(self, summary: dict | None) -> None:
        self._summary = summary

    def get_monitoring_summary(self) -> dict | None:
        return self._summary


class TestCompoundRiskService:
    def test_detect_compound_risks_pulls_from_all_three_sources(self) -> None:
        engine = CompoundRiskEngine(rules=[CriticalSensorWithWorkerPresentRule(points=40.0)])
        service = CompoundRiskService(
            engine=engine,
            sensor_monitoring=_StubSensorMonitoring(_sensor_summary("Zone-G", "critical")),
            worker_monitoring=_StubWorkerMonitoring(_worker_summary("Zone-G")),
            permit_validation=_StubPermitValidation(None),
        )
        results = service.detect_compound_risks()
        assert len(results) == 1
        assert results[0].zone == "Zone-G"

    def test_detect_compound_risks_handles_missing_sources(self) -> None:
        engine = CompoundRiskEngine(rules=[CriticalSensorWithWorkerPresentRule(points=40.0)])
        service = CompoundRiskService(engine=engine)
        results = service.detect_compound_risks()
        assert results == []

    def test_evaluate_accepts_precomputed_summaries(self) -> None:
        engine = CompoundRiskEngine(rules=[MultipleWarningSensorsRule(points=15.0, minimum_warning_count=2)])
        service = CompoundRiskService(engine=engine)
        results = service.evaluate(sensor_summary=_sensor_summary("Zone-H", "warning", count=2))
        assert len(results) == 1
        assert results[0].zone == "Zone-H"

    def test_detect_compound_risks_pulls_maintenance_summary_when_configured(self) -> None:
        engine = CompoundRiskEngine(
            rules=[
                DegradedEquipmentWithWorkerPresentRule(
                    points=25.0, equipment_zone_map={"EQ-001": "Zone-J"}
                )
            ]
        )
        service = CompoundRiskService(
            engine=engine,
            worker_monitoring=_StubWorkerMonitoring(_worker_summary("Zone-J")),
            maintenance_monitoring=_StubMaintenanceMonitoring(_maintenance_summary("EQ-001")),
        )
        results = service.detect_compound_risks()
        assert len(results) == 1
        assert results[0].zone == "Zone-J"

    def test_service_without_maintenance_monitoring_still_works(self) -> None:
        """Backward compatibility: a service built the old way (no
        maintenance_monitoring kwarg) must keep behaving exactly as before."""
        engine = CompoundRiskEngine(rules=[CriticalSensorWithWorkerPresentRule(points=40.0)])
        service = CompoundRiskService(
            engine=engine,
            sensor_monitoring=_StubSensorMonitoring(_sensor_summary("Zone-K", "critical")),
            worker_monitoring=_StubWorkerMonitoring(_worker_summary("Zone-K")),
            permit_validation=_StubPermitValidation(None),
        )
        results = service.detect_compound_risks()
        assert len(results) == 1
        assert results[0].zone == "Zone-K"

    def test_evaluate_without_maintenance_summary_kwarg_still_works(self) -> None:
        """Backward compatibility: old 3-kwarg evaluate() calls are unaffected."""
        engine = CompoundRiskEngine(rules=[MultipleWarningSensorsRule(points=15.0, minimum_warning_count=2)])
        service = CompoundRiskService(engine=engine)
        results = service.evaluate(
            sensor_summary=_sensor_summary("Zone-L", "warning", count=2),
            worker_summary=None,
            permit_summary=None,
        )
        assert len(results) == 1
        assert results[0].zone == "Zone-L"

    def test_detect_compound_risks_pulls_camera_summary_when_configured(self) -> None:
        engine = CompoundRiskEngine(
            rules=[CameraCriticalDetectionWithoutActivePermitRule(points=35.0)]
        )
        service = CompoundRiskService(
            engine=engine,
            permit_validation=_StubPermitValidation(_permit_summary("Zone-M", "expired")),
            camera_monitoring=_StubCameraMonitoring(_camera_summary("Zone-M")),
        )
        results = service.detect_compound_risks()
        assert len(results) == 1
        assert results[0].zone == "Zone-M"

    def test_service_without_camera_monitoring_still_works(self) -> None:
        """Backward compatibility: a service built without camera_monitoring
        must keep behaving exactly as before this parameter existed."""
        engine = CompoundRiskEngine(rules=[CriticalSensorWithWorkerPresentRule(points=40.0)])
        service = CompoundRiskService(
            engine=engine,
            sensor_monitoring=_StubSensorMonitoring(_sensor_summary("Zone-N", "critical")),
            worker_monitoring=_StubWorkerMonitoring(_worker_summary("Zone-N")),
        )
        results = service.detect_compound_risks()
        assert len(results) == 1
        assert results[0].zone == "Zone-N"

    def test_evaluate_without_camera_summary_kwarg_still_works(self) -> None:
        """Backward compatibility: old 4-kwarg evaluate() calls are unaffected."""
        engine = CompoundRiskEngine(rules=[MultipleWarningSensorsRule(points=15.0, minimum_warning_count=2)])
        service = CompoundRiskService(engine=engine)
        results = service.evaluate(
            sensor_summary=_sensor_summary("Zone-O", "warning", count=2),
            worker_summary=None,
            permit_summary=None,
            maintenance_summary=None,
        )
        assert len(results) == 1
        assert results[0].zone == "Zone-O"


class TestZoneCompoundRiskResultExplanation:
    def test_explanation_lists_all_triggered_rules(self) -> None:
        engine = CompoundRiskEngine(
            rules=[
                CriticalSensorWithoutActivePermitRule(points=35.0),
                MultipleWarningSensorsRule(points=15.0, minimum_warning_count=1),
            ]
        )
        sensor_summary = {
            "sensors": [
                {"zone": "Zone-I", "computed_status": "critical"},
                {"zone": "Zone-I", "computed_status": "warning"},
            ]
        }
        results = engine.evaluate(sensor_summary=sensor_summary, permit_summary=None, worker_summary=None)
        assert len(results) == 1
        explanation = results[0].explanation
        assert "critical sensor" in explanation.lower()
        assert "warning-level" in explanation.lower()

    def test_no_rules_triggered_gives_default_explanation(self) -> None:
        engine = CompoundRiskEngine(rules=[])
        results = engine.evaluate(sensor_summary=None, permit_summary=None, worker_summary=None)
        assert results == []


class TestDegradedEquipmentWithWorkerPresentRule:
    def test_fires_when_degraded_equipment_and_worker_present(self) -> None:
        rule = DegradedEquipmentWithWorkerPresentRule(points=25.0, equipment_zone_map={"EQ-001": "Zone-M"})
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=_worker_summary("Zone-M"),
            maintenance_summary=_maintenance_summary("EQ-001"),
        )
        assert "Zone-M" in matches
        assert matches["Zone-M"].points == 25.0
        assert matches["Zone-M"].rule_name == "degraded_equipment_with_worker_present"

    def test_does_not_fire_without_worker(self) -> None:
        rule = DegradedEquipmentWithWorkerPresentRule(points=25.0, equipment_zone_map={"EQ-001": "Zone-M"})
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=None,
            maintenance_summary=_maintenance_summary("EQ-001"),
        )
        assert matches == {}

    def test_does_not_fire_when_equipment_healthy(self) -> None:
        rule = DegradedEquipmentWithWorkerPresentRule(points=25.0, equipment_zone_map={"EQ-001": "Zone-M"})
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=_worker_summary("Zone-M"),
            maintenance_summary=_maintenance_summary("EQ-001", health_status="healthy"),
        )
        assert matches == {}

    def test_does_not_fire_without_equipment_zone_map_entry(self) -> None:
        rule = DegradedEquipmentWithWorkerPresentRule(points=25.0, equipment_zone_map={})
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=_worker_summary("Zone-M"),
            maintenance_summary=_maintenance_summary("EQ-001"),
        )
        assert matches == {}

    def test_match_reports_reduced_confidence(self) -> None:
        rule = DegradedEquipmentWithWorkerPresentRule(points=25.0, equipment_zone_map={"EQ-001": "Zone-M"})
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=_worker_summary("Zone-M"),
            maintenance_summary=_maintenance_summary("EQ-001"),
        )
        assert matches["Zone-M"].confidence < 1.0

    def test_match_includes_structured_evidence(self) -> None:
        rule = DegradedEquipmentWithWorkerPresentRule(points=25.0, equipment_zone_map={"EQ-001": "Zone-M"})
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=_worker_summary("Zone-M", count=3),
            maintenance_summary=_maintenance_summary("EQ-001"),
        )
        evidence = matches["Zone-M"].evidence
        assert evidence["worker_count"] == 3
        assert evidence["degraded_equipment"][0]["equipment_id"] == "EQ-001"


class TestCriticalSensorNearDegradedEquipmentRule:
    def test_fires_when_critical_sensor_and_degraded_equipment_share_zone(self) -> None:
        rule = CriticalSensorNearDegradedEquipmentRule(points=30.0, equipment_zone_map={"EQ-002": "Zone-N"})
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-N", "critical"),
            permit_summary=None,
            worker_summary=None,
            maintenance_summary=_maintenance_summary("EQ-002"),
        )
        assert "Zone-N" in matches
        assert matches["Zone-N"].confidence < 1.0

    def test_does_not_fire_without_critical_sensor(self) -> None:
        rule = CriticalSensorNearDegradedEquipmentRule(points=30.0, equipment_zone_map={"EQ-002": "Zone-N"})
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-N", "warning"),
            permit_summary=None,
            worker_summary=None,
            maintenance_summary=_maintenance_summary("EQ-002"),
        )
        assert matches == {}

    def test_does_not_fire_without_maintenance_summary(self) -> None:
        rule = CriticalSensorNearDegradedEquipmentRule(points=30.0, equipment_zone_map={"EQ-002": "Zone-N"})
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-N", "critical"),
            permit_summary=None,
            worker_summary=None,
            maintenance_summary=None,
        )
        assert matches == {}


class TestCompoundRiskRuleMatchEvidenceAndConfidence:
    def test_existing_rules_default_to_full_confidence(self) -> None:
        rule = CriticalSensorWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-O", "critical"),
            permit_summary=_permit_summary("Zone-O", "expired"),
            worker_summary=None,
        )
        assert matches["Zone-O"].confidence == 1.0

    def test_existing_rules_populate_structured_evidence(self) -> None:
        rule = CriticalSensorWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(
            sensor_summary=_sensor_summary("Zone-O", "critical"),
            permit_summary=_permit_summary("Zone-O", "expired"),
            worker_summary=None,
        )
        assert matches["Zone-O"].evidence["sensor_status_counts"]["critical"] == 1
        assert matches["Zone-O"].evidence["permit_validation_states"] == ["expired"]

    def test_rule_match_default_evidence_is_empty_dict(self) -> None:
        match = CompoundRiskRuleMatch(rule_name="x", points=1.0, explanation="y")
        assert match.evidence == {}
        assert match.confidence == 1.0


class TestZoneCompoundRiskResultConfidenceAndEvidence:
    def test_confidence_defaults_to_full_when_no_rules_triggered(self) -> None:
        engine = CompoundRiskEngine(rules=[])
        results = engine.evaluate(sensor_summary=None, permit_summary=None, worker_summary=None)
        assert results == []

    def test_confidence_is_full_when_only_full_confidence_rules_trigger(self) -> None:
        engine = CompoundRiskEngine(rules=[CriticalSensorWithoutActivePermitRule(points=35.0)])
        results = engine.evaluate(
            sensor_summary=_sensor_summary("Zone-P", "critical"),
            permit_summary=_permit_summary("Zone-P", "expired"),
            worker_summary=None,
        )
        assert results[0].confidence == 1.0

    def test_confidence_drops_when_a_low_confidence_rule_dominates_the_score(self) -> None:
        engine = CompoundRiskEngine(
            rules=[
                DegradedEquipmentWithWorkerPresentRule(points=90.0, equipment_zone_map={"EQ-003": "Zone-Q"}),
            ]
        )
        results = engine.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=_worker_summary("Zone-Q"),
            maintenance_summary=_maintenance_summary("EQ-003"),
        )
        assert results[0].confidence == pytest.approx(0.7, abs=0.001)

    def test_confidence_is_points_weighted_average_across_mixed_rules(self) -> None:
        engine = CompoundRiskEngine(
            rules=[
                CriticalSensorWithoutActivePermitRule(points=50.0),  # confidence 1.0
                DegradedEquipmentWithWorkerPresentRule(
                    points=50.0, equipment_zone_map={"EQ-004": "Zone-R"}
                ),  # confidence 0.7
            ]
        )
        results = engine.evaluate(
            sensor_summary=_sensor_summary("Zone-R", "critical"),
            permit_summary=None,
            worker_summary=_worker_summary("Zone-R"),
            maintenance_summary=_maintenance_summary("EQ-004"),
        )
        # (50*1.0 + 50*0.7) / 100 = 0.85
        assert results[0].confidence == pytest.approx(0.85, abs=0.001)

    def test_contributing_factors_is_an_alias_for_triggered_rules(self) -> None:
        engine = CompoundRiskEngine(rules=[CriticalSensorWithoutActivePermitRule(points=35.0)])
        results = engine.evaluate(
            sensor_summary=_sensor_summary("Zone-S", "critical"),
            permit_summary=_permit_summary("Zone-S", "expired"),
            worker_summary=None,
        )
        assert results[0].contributing_factors == results[0].triggered_rules

    def test_evidence_property_keys_by_rule_name(self) -> None:
        engine = CompoundRiskEngine(rules=[CriticalSensorWithoutActivePermitRule(points=35.0)])
        results = engine.evaluate(
            sensor_summary=_sensor_summary("Zone-T", "critical"),
            permit_summary=_permit_summary("Zone-T", "expired"),
            worker_summary=None,
        )
        assert "critical_sensor_without_active_permit" in results[0].evidence

    def test_evidence_is_empty_dict_when_no_rules_triggered(self) -> None:
        engine = CompoundRiskEngine(rules=[CriticalSensorWithoutActivePermitRule(points=35.0)])
        results = engine.evaluate(sensor_summary=None, permit_summary=None, worker_summary=None)
        assert results == []


class TestEngineMaintenanceSummaryBackwardCompatibility:
    def test_evaluate_without_maintenance_summary_arg_still_works(self) -> None:
        """Backward compatibility: engines/rules built before maintenance_summary
        existed keep working when the caller never passes it."""
        engine = CompoundRiskEngine(rules=[CriticalSensorWithWorkerPresentRule(points=40.0)])
        results = engine.evaluate(
            sensor_summary=_sensor_summary("Zone-U", "critical"),
            permit_summary=None,
            worker_summary=_worker_summary("Zone-U"),
        )
        assert len(results) == 1
        assert results[0].zone == "Zone-U"

    def test_evaluate_with_maintenance_summary_but_no_maintenance_rules_is_a_no_op(self) -> None:
        engine = CompoundRiskEngine(rules=[CriticalSensorWithWorkerPresentRule(points=40.0)])
        results = engine.evaluate(
            sensor_summary=_sensor_summary("Zone-V", "critical"),
            permit_summary=None,
            worker_summary=_worker_summary("Zone-V"),
            maintenance_summary=_maintenance_summary("EQ-999"),
        )
        assert len(results) == 1
        assert results[0].zone == "Zone-V"


class TestCameraCriticalDetectionWithoutActivePermitRule:
    def test_fires_when_critical_camera_finding_and_no_valid_permit(self) -> None:
        rule = CameraCriticalDetectionWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=_permit_summary("Zone-W", "expired"),
            worker_summary=None,
            camera_summary=_camera_summary("Zone-W"),
        )
        assert "Zone-W" in matches
        assert matches["Zone-W"].points == 35.0
        assert matches["Zone-W"].rule_name == "camera_critical_detection_without_active_permit"

    def test_does_not_fire_when_valid_permit_present(self) -> None:
        rule = CameraCriticalDetectionWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=_permit_summary("Zone-W", "valid"),
            worker_summary=None,
            camera_summary=_camera_summary("Zone-W"),
        )
        assert matches == {}

    def test_does_not_fire_without_critical_camera_finding(self) -> None:
        rule = CameraCriticalDetectionWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=None,
            camera_summary=_camera_summary("Zone-W", severity="medium"),
        )
        assert matches == {}

    def test_does_not_fire_without_camera_summary(self) -> None:
        rule = CameraCriticalDetectionWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(sensor_summary=None, permit_summary=None, worker_summary=None)
        assert matches == {}

    def test_match_includes_camera_evidence(self) -> None:
        rule = CameraCriticalDetectionWithoutActivePermitRule(points=35.0)
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=_permit_summary("Zone-W", "expired"),
            worker_summary=None,
            camera_summary=_camera_summary("Zone-W"),
        )
        assert matches["Zone-W"].evidence["camera_severity_counts"]["critical"] == 1


class TestPPEViolationWithWorkerPresentRule:
    def test_fires_when_finding_and_worker_present(self) -> None:
        rule = PPEViolationWithWorkerPresentRule(points=20.0)
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=_worker_summary("Zone-X"),
            camera_summary=_camera_summary("Zone-X", severity="high", rule_name="missing_helmet"),
        )
        assert "Zone-X" in matches
        assert matches["Zone-X"].rule_name == "ppe_violation_with_worker_present"

    def test_does_not_fire_without_worker(self) -> None:
        rule = PPEViolationWithWorkerPresentRule(points=20.0)
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=None,
            camera_summary=_camera_summary("Zone-X", severity="high"),
        )
        assert matches == {}

    def test_does_not_fire_below_minimum_severity(self) -> None:
        rule = PPEViolationWithWorkerPresentRule(points=20.0, minimum_severity_rank=2)
        matches = rule.evaluate(
            sensor_summary=None,
            permit_summary=None,
            worker_summary=_worker_summary("Zone-X"),
            camera_summary=_camera_summary("Zone-X", severity="low"),
        )
        assert matches == {}

    def test_does_not_fire_without_camera_summary(self) -> None:
        rule = PPEViolationWithWorkerPresentRule(points=20.0)
        matches = rule.evaluate(
            sensor_summary=None, permit_summary=None, worker_summary=_worker_summary("Zone-X")
        )
        assert matches == {}


class TestCameraSummaryIntegration:
    def test_engine_evaluate_accepts_camera_summary_and_returns_confidence(self) -> None:
        engine = CompoundRiskEngine(
            rules=[
                CameraCriticalDetectionWithoutActivePermitRule(points=35.0),
                PPEViolationWithWorkerPresentRule(points=20.0),
            ]
        )
        results = engine.evaluate(
            sensor_summary=None,
            permit_summary=_permit_summary("Zone-Y", "expired"),
            worker_summary=_worker_summary("Zone-Y"),
            camera_summary=_camera_summary("Zone-Y"),
        )
        assert len(results) == 1
        assert results[0].zone == "Zone-Y"
        assert results[0].risk_score == 55.0
        assert results[0].confidence == 1.0

    def test_evaluate_without_camera_summary_still_works(self) -> None:
        """Backward compatibility: callers built before camera_summary existed
        keep working when they never pass it."""
        engine = CompoundRiskEngine(rules=[CriticalSensorWithWorkerPresentRule(points=40.0)])
        results = engine.evaluate(
            sensor_summary=_sensor_summary("Zone-Z", "critical"),
            permit_summary=None,
            worker_summary=_worker_summary("Zone-Z"),
        )
        assert len(results) == 1
        assert results[0].zone == "Zone-Z"
