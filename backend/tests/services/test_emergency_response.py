"""Tests for the Emergency Response engine and service."""

from __future__ import annotations

from src.models.enums import EmergencyActionType, IncidentType, RiskLevel
from src.services.compound_risk.schemas import CompoundRiskRuleMatch, ZoneCompoundRiskResult
from src.services.emergency_response.emergency_response_service import EmergencyResponseService
from src.services.emergency_response.engine import EmergencyResponseEngine
from src.services.emergency_response.rules import ThresholdEmergencyResponseRule


def _zone_result(zone: str, score: float, level: RiskLevel = RiskLevel.HIGH) -> ZoneCompoundRiskResult:
    return ZoneCompoundRiskResult(
        zone=zone,
        risk_score=score,
        risk_level=level,
        triggered_rules=[
            CompoundRiskRuleMatch(
                rule_name="critical_sensor_with_worker_present",
                points=score,
                explanation=f"Zone '{zone}' triggered a compound rule.",
            )
        ],
    )


class _StubIncidentRepository:
    def __init__(self) -> None:
        self.created: list[dict] = []

    def create(self, data: dict):
        self.created.append(data)

        class _Incident:
            id = "stub-incident-id"

        return _Incident()


def _build_engine(rules: dict[str, tuple[EmergencyActionType, float]]) -> EmergencyResponseEngine:
    return EmergencyResponseEngine(
        rules=[
            ThresholdEmergencyResponseRule(rule_name=name, action=action, threshold=threshold)
            for name, (action, threshold) in rules.items()
        ]
    )


class TestThresholdEmergencyResponseRule:
    def test_fires_when_score_meets_threshold(self) -> None:
        rule = ThresholdEmergencyResponseRule(
            rule_name="stop_work", action=EmergencyActionType.STOP_WORK, threshold=45.0
        )
        match = rule.evaluate(_zone_result("Zone-A", 45.0))
        assert match is not None
        assert match.action == EmergencyActionType.STOP_WORK
        assert match.triggered_by_rule == "stop_work"

    def test_does_not_fire_below_threshold(self) -> None:
        rule = ThresholdEmergencyResponseRule(
            rule_name="stop_work", action=EmergencyActionType.STOP_WORK, threshold=45.0
        )
        match = rule.evaluate(_zone_result("Zone-A", 44.9))
        assert match is None


class TestEmergencyResponseEngine:
    def test_zone_can_trigger_multiple_actions(self) -> None:
        engine = _build_engine(
            {
                "notify_safety_officer": (EmergencyActionType.NOTIFY_SAFETY_OFFICER, 20.0),
                "stop_work": (EmergencyActionType.STOP_WORK, 45.0),
                "evacuate_area": (EmergencyActionType.EVACUATE_AREA, 70.0),
            }
        )
        results = engine.evaluate([_zone_result("Zone-A", 75.0)])
        assert len(results) == 1
        actions = results[0].action_types
        assert EmergencyActionType.NOTIFY_SAFETY_OFFICER in actions
        assert EmergencyActionType.STOP_WORK in actions
        assert EmergencyActionType.EVACUATE_AREA in actions

    def test_zone_with_no_matching_rule_is_omitted(self) -> None:
        engine = _build_engine({"evacuate_area": (EmergencyActionType.EVACUATE_AREA, 70.0)})
        results = engine.evaluate([_zone_result("Zone-A", 10.0)])
        assert results == []

    def test_results_sorted_by_score_descending(self) -> None:
        engine = _build_engine(
            {"notify_safety_officer": (EmergencyActionType.NOTIFY_SAFETY_OFFICER, 10.0)}
        )
        results = engine.evaluate(
            [_zone_result("Zone-Low", 20.0), _zone_result("Zone-High", 90.0)]
        )
        assert [result.zone for result in results] == ["Zone-High", "Zone-Low"]


class TestEmergencyResponseService:
    def test_generate_incident_action_persists_incident(self) -> None:
        engine = _build_engine(
            {"generate_incident": (EmergencyActionType.GENERATE_INCIDENT, 70.0)}
        )
        incident_repository = _StubIncidentRepository()
        service = EmergencyResponseService(engine=engine, incident_repository=incident_repository)

        results = service.respond([_zone_result("Zone-A", 80.0, RiskLevel.CRITICAL)])

        assert len(results) == 1
        assert len(incident_repository.created) == 1
        created = incident_repository.created[0]
        assert created["zone"] == "Zone-A"
        assert created["incident_type"] == IncidentType.EMERGENCY_RESPONSE

    def test_non_incident_actions_do_not_touch_repository(self) -> None:
        engine = _build_engine(
            {"notify_control_room": (EmergencyActionType.NOTIFY_CONTROL_ROOM, 45.0)}
        )
        incident_repository = _StubIncidentRepository()
        service = EmergencyResponseService(engine=engine, incident_repository=incident_repository)

        results = service.respond([_zone_result("Zone-A", 50.0)])

        assert len(results) == 1
        assert incident_repository.created == []

    def test_generate_incident_without_repository_does_not_raise(self) -> None:
        engine = _build_engine(
            {"generate_incident": (EmergencyActionType.GENERATE_INCIDENT, 70.0)}
        )
        service = EmergencyResponseService(engine=engine, incident_repository=None)

        results = service.respond([_zone_result("Zone-A", 80.0)])

        assert len(results) == 1

    def test_no_zones_trigger_returns_empty_list(self) -> None:
        engine = _build_engine(
            {"evacuate_area": (EmergencyActionType.EVACUATE_AREA, 70.0)}
        )
        service = EmergencyResponseService(engine=engine)

        results = service.respond([_zone_result("Zone-A", 10.0)])

        assert results == []
