"""Tests for the centralised emergency response rules configuration."""

from __future__ import annotations

from src.config.emergency_rules import CONDITION_ACTION_RULES, get_actions_for
from src.models.enums import EmergencyActionType, EmergencyCondition


class TestEmergencyResponseRules:
    def test_registry_has_expected_conditions(self) -> None:
        expected = {
            EmergencyCondition.CRITICAL_GAS,
            EmergencyCondition.FIRE,
            EmergencyCondition.EXPIRED_PERMIT,
            EmergencyCondition.WORKER_DOWN,
        }
        assert set(CONDITION_ACTION_RULES) == expected

    def test_every_rule_has_at_least_one_action(self) -> None:
        for rule in CONDITION_ACTION_RULES.values():
            assert len(rule.actions) >= 1

    def test_every_rule_has_a_description(self) -> None:
        for rule in CONDITION_ACTION_RULES.values():
            assert rule.description

    def test_rule_key_matches_its_own_condition(self) -> None:
        for condition, rule in CONDITION_ACTION_RULES.items():
            assert rule.condition == condition

    def test_critical_gas_maps_to_evacuate_and_stop_work(self) -> None:
        actions = CONDITION_ACTION_RULES[EmergencyCondition.CRITICAL_GAS].actions
        assert EmergencyActionType.EVACUATE_AREA in actions
        assert EmergencyActionType.STOP_WORK in actions

    def test_fire_maps_to_evacuate_and_notify_fire_team(self) -> None:
        actions = CONDITION_ACTION_RULES[EmergencyCondition.FIRE].actions
        assert EmergencyActionType.EVACUATE_AREA in actions
        assert EmergencyActionType.NOTIFY_FIRE_TEAM in actions

    def test_expired_permit_maps_to_suspend_permit(self) -> None:
        actions = CONDITION_ACTION_RULES[EmergencyCondition.EXPIRED_PERMIT].actions
        assert actions == (EmergencyActionType.SUSPEND_PERMIT,)

    def test_worker_down_maps_to_notify_medical_team(self) -> None:
        actions = CONDITION_ACTION_RULES[EmergencyCondition.WORKER_DOWN].actions
        assert actions == (EmergencyActionType.NOTIFY_MEDICAL_TEAM,)


class TestGetActionsFor:
    def test_returns_actions_for_known_condition(self) -> None:
        actions = get_actions_for(EmergencyCondition.FIRE)
        assert EmergencyActionType.NOTIFY_FIRE_TEAM in actions

    def test_returns_empty_tuple_for_unmapped_condition(self) -> None:
        # Every EmergencyCondition member is currently mapped; this guards
        # the registry-miss fallback path itself using a value not in the
        # registry, so the assertion holds even as new conditions are added.
        unmapped = "not_a_real_condition"
        assert get_actions_for(unmapped) == ()  # type: ignore[arg-type]
