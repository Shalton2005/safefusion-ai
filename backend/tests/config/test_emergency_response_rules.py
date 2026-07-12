"""Tests for the centralised emergency response rule configuration."""

from __future__ import annotations

from src.config.risk_rules import EMERGENCY_RESPONSE_RULES


class TestEmergencyResponseRules:
    def test_registry_has_expected_rule_names(self) -> None:
        expected = {
            "notify_safety_officer",
            "notify_control_room",
            "stop_work",
            "isolate_equipment",
            "evacuate_area",
            "generate_incident",
        }
        assert set(EMERGENCY_RESPONSE_RULES) == expected

    def test_every_rule_has_positive_points(self) -> None:
        for rule in EMERGENCY_RESPONSE_RULES.values():
            assert rule.points > 0

    def test_every_rule_has_a_description(self) -> None:
        for rule in EMERGENCY_RESPONSE_RULES.values():
            assert rule.description

    def test_notify_safety_officer_threshold_is_lowest(self) -> None:
        notify = EMERGENCY_RESPONSE_RULES["notify_safety_officer"].points
        for name, rule in EMERGENCY_RESPONSE_RULES.items():
            if name == "notify_safety_officer":
                continue
            assert notify <= rule.points
