"""Tests for the centralised risk rule configuration."""

from __future__ import annotations

from src.config.risk_rules import (
    COMPOUND_RISK_LEVEL_BANDS,
    COMPOUND_RISK_RULES,
    RISK_SCORE_LEVEL_BANDS,
    RISK_SCORE_RULES,
)


class TestRiskScoreRules:
    def test_registry_has_expected_rule_names(self) -> None:
        expected = {
            "critical_sensors",
            "warning_sensors",
            "expired_permits",
            "restricted_zone_workers",
        }
        assert set(RISK_SCORE_RULES) == expected

    def test_every_rule_has_positive_points(self) -> None:
        for rule in RISK_SCORE_RULES.values():
            assert rule.points > 0

    def test_restricted_zone_workers_carries_zone_params(self) -> None:
        rule = RISK_SCORE_RULES["restricted_zone_workers"]
        assert "restricted_zones" in rule.params
        assert isinstance(rule.params["restricted_zones"], set)

    def test_level_bands_are_ascending(self) -> None:
        bands = RISK_SCORE_LEVEL_BANDS
        assert bands["low_max"] < bands["medium_max"] < bands["high_max"]


class TestCompoundRiskRules:
    def test_registry_has_expected_rule_names(self) -> None:
        expected = {
            "critical_sensor_without_active_permit",
            "expired_permit_with_worker_present",
            "critical_sensor_with_worker_present",
            "restricted_zone_without_active_permit",
            "multiple_warning_sensors",
            "degraded_equipment_with_worker_present",
            "critical_sensor_near_degraded_equipment",
            "camera_critical_detection_without_active_permit",
            "ppe_violation_with_worker_present",
        }
        assert set(COMPOUND_RISK_RULES) == expected

    def test_every_rule_has_positive_points(self) -> None:
        for rule in COMPOUND_RISK_RULES.values():
            assert rule.points > 0

    def test_multiple_warning_sensors_carries_threshold_param(self) -> None:
        rule = COMPOUND_RISK_RULES["multiple_warning_sensors"]
        assert rule.params["minimum_warning_count"] >= 1

    def test_level_bands_are_ascending(self) -> None:
        bands = COMPOUND_RISK_LEVEL_BANDS
        assert bands["low_max"] < bands["medium_max"] < bands["high_max"]

    def test_every_rule_has_a_description(self) -> None:
        for rule in COMPOUND_RISK_RULES.values():
            assert rule.description
