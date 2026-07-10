"""Tests for the Compound Risk Detection service."""

from __future__ import annotations

from src.models.enums import RiskLevel
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.compound_risk.engine import CompoundRiskEngine
from src.services.compound_risk.rules import (
    CriticalSensorWithoutActivePermitRule,
    CriticalSensorWithWorkerPresentRule,
    ExpiredPermitWithWorkerPresentRule,
    MultipleWarningSensorsRule,
    RestrictedZoneWithoutActivePermitRule,
)
from src.services.compound_risk.schemas import CompoundRiskLevelBands


def _sensor_summary(zone: str, status: str, count: int = 1) -> dict:
    return {"sensors": [{"zone": zone, "computed_status": status} for _ in range(count)]}


def _permit_summary(zone: str, state: str) -> dict:
    return {"permits": [{"zone": zone, "validation_state": state}]}


def _worker_summary(zone: str, count: int = 1) -> dict:
    return {"workers": [{"assigned_zone": zone} for _ in range(count)]}


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
