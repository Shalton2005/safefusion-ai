"""Tests for the Incident Report Generator and service."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from src.models.enums import (
    ComplianceFramework,
    ComplianceStatus,
    EmergencyActionType,
    IncidentType,
    RiskLevel,
    SeverityLevel,
)
from src.models.incident import Incident
from src.services.compliance.schemas import ComplianceViolation, IncidentComplianceResult
from src.services.compound_risk.schemas import CompoundRiskRuleMatch, ZoneCompoundRiskResult
from src.services.emergency_response.schemas import EmergencyActionMatch, ZoneEmergencyResponseResult
from src.services.incident_report.generator import IncidentReportGenerator
from src.services.incident_report.incident_report_service import IncidentReportService


def _incident(
    zone: str = "Zone-A",
    incident_type: IncidentType = IncidentType.GAS_LEAK,
    severity: SeverityLevel = SeverityLevel.HIGH,
) -> Incident:
    occurred = datetime(2026, 7, 10, 8, 0, tzinfo=UTC)
    return Incident(
        id=uuid.uuid4(),
        zone=zone,
        severity=severity,
        incident_type=incident_type,
        description="Gas leak near compressor.",
        root_cause="Worn gasket.",
        occurred_at=occurred,
        created_at=datetime(2026, 7, 10, 8, 5, tzinfo=UTC),
        updated_at=datetime(2026, 7, 10, 8, 5, tzinfo=UTC),
    )


def _compound_risk_result(zone: str) -> ZoneCompoundRiskResult:
    return ZoneCompoundRiskResult(
        zone=zone,
        risk_score=82.5,
        risk_level=RiskLevel.CRITICAL,
        triggered_rules=[
            CompoundRiskRuleMatch(
                rule_name="critical_sensor_with_worker_present",
                points=40.0,
                explanation=f"Zone '{zone}' has a critical sensor reading with workers present.",
            )
        ],
    )


def _emergency_result(zone: str) -> ZoneEmergencyResponseResult:
    return ZoneEmergencyResponseResult(
        zone=zone,
        risk_score=82.5,
        risk_level=RiskLevel.CRITICAL,
        actions=[
            EmergencyActionMatch(
                action=EmergencyActionType.EVACUATE_AREA,
                triggered_by_rule="evacuate_area",
                explanation=f"Zone '{zone}' compound risk score reached the evacuation threshold.",
            )
        ],
    )


def _compliance_result(incident: Incident) -> IncidentComplianceResult:
    return IncidentComplianceResult(
        incident_id=str(incident.id),
        status=ComplianceStatus.NON_COMPLIANT,
        violations=[
            ComplianceViolation(
                rule_code="factory_act_gas_leak_reporting",
                framework=ComplianceFramework.FACTORY_ACT,
                title="Hazardous Gas Leak Reporting (Factories Act)",
                description="desc",
                recommendation="File a hazardous-substance incident report.",
            )
        ],
    )


class TestIncidentReportGenerator:
    def test_summary_reflects_the_incident(self) -> None:
        incident = _incident()
        report = IncidentReportGenerator().generate(incident)
        assert report.summary.incident_id == str(incident.id)
        assert report.summary.zone == "Zone-A"
        assert report.summary.incident_type == IncidentType.GAS_LEAK
        assert report.summary.severity == SeverityLevel.HIGH
        assert report.summary.root_cause == "Worn gasket."

    def test_timeline_includes_occurred_and_logged_events_in_order(self) -> None:
        incident = _incident()
        report = IncidentReportGenerator().generate(incident)
        labels = [event.label for event in report.timeline]
        assert labels == ["incident_occurred", "incident_logged"]
        assert report.timeline[0].timestamp <= report.timeline[1].timestamp

    def test_timeline_includes_update_event_when_updated_after_creation(self) -> None:
        incident = _incident()
        object.__setattr__(incident, "updated_at", datetime(2026, 7, 10, 9, 0, tzinfo=UTC))
        report = IncidentReportGenerator().generate(incident)
        assert "incident_updated" in [event.label for event in report.timeline]

    def test_detected_risks_empty_without_compound_risk_input(self) -> None:
        report = IncidentReportGenerator().generate(_incident())
        assert report.detected_risks == []
        assert report.triggered_rules == []

    def test_detected_risks_filtered_by_zone(self) -> None:
        incident = _incident(zone="Zone-A")
        report = IncidentReportGenerator().generate(
            incident,
            compound_risk_results=[_compound_risk_result("Zone-A"), _compound_risk_result("Zone-B")],
        )
        assert len(report.detected_risks) == 1
        assert report.detected_risks[0].zone == "Zone-A"

    def test_triggered_rules_extracted_from_matching_zone_results(self) -> None:
        incident = _incident(zone="Zone-A")
        report = IncidentReportGenerator().generate(
            incident, compound_risk_results=[_compound_risk_result("Zone-A")]
        )
        assert len(report.triggered_rules) == 1
        assert report.triggered_rules[0].rule_name == "critical_sensor_with_worker_present"

    def test_emergency_actions_filtered_by_zone(self) -> None:
        incident = _incident(zone="Zone-A")
        report = IncidentReportGenerator().generate(
            incident,
            emergency_response_results=[_emergency_result("Zone-A"), _emergency_result("Zone-B")],
        )
        assert len(report.emergency_actions) == 1
        assert report.emergency_actions[0].action == EmergencyActionType.EVACUATE_AREA.value

    def test_emergency_actions_appear_in_timeline(self) -> None:
        incident = _incident(zone="Zone-A")
        report = IncidentReportGenerator().generate(
            incident, emergency_response_results=[_emergency_result("Zone-A")]
        )
        labels = [event.label for event in report.timeline]
        assert "emergency_action:evacuate_area" in labels

    def test_compliance_notes_empty_without_compliance_result(self) -> None:
        report = IncidentReportGenerator().generate(_incident())
        assert report.compliance_notes == []
        assert report.compliance_status is None

    def test_compliance_notes_populated_from_compliance_result(self) -> None:
        incident = _incident()
        report = IncidentReportGenerator().generate(incident, compliance_result=_compliance_result(incident))
        assert len(report.compliance_notes) == 1
        assert report.compliance_notes[0].rule_code == "factory_act_gas_leak_reporting"
        assert report.compliance_status == ComplianceStatus.NON_COMPLIANT

    def test_all_six_sections_present_even_when_empty(self) -> None:
        report = IncidentReportGenerator().generate(_incident())
        assert report.summary is not None
        assert isinstance(report.timeline, list) and report.timeline
        assert report.detected_risks == []
        assert report.triggered_rules == []
        assert report.emergency_actions == []
        assert report.compliance_notes == []


class _StubIncidentRepository:
    def __init__(self, incidents: dict[uuid.UUID, Incident]) -> None:
        self._incidents = incidents

    def get_by_id(self, record_id: uuid.UUID) -> Incident | None:
        return self._incidents.get(record_id)

    def get_most_recent(self) -> Incident | None:
        if not self._incidents:
            return None
        return max(self._incidents.values(), key=lambda incident: incident.occurred_at)


class _StubCompoundRisk:
    def __init__(self, results: list[ZoneCompoundRiskResult]) -> None:
        self._results = results

    def detect_compound_risks(self) -> list[ZoneCompoundRiskResult]:
        return self._results


class _StubEmergencyResponse:
    def __init__(self, results: list[ZoneEmergencyResponseResult]) -> None:
        self._results = results

    def respond(self, zone_results: list[ZoneCompoundRiskResult]) -> list[ZoneEmergencyResponseResult]:
        return self._results


class _StubCompliance:
    def __init__(self, result: IncidentComplianceResult) -> None:
        self._result = result

    def evaluate_incident(self, incident: Incident) -> IncidentComplianceResult:
        return self._result


class TestIncidentReportService:
    def test_generate_report_returns_none_for_missing_incident(self) -> None:
        service = IncidentReportService(
            generator=IncidentReportGenerator(), incident_repository=_StubIncidentRepository({})
        )
        assert service.generate_report(uuid.uuid4()) is None

    def test_generate_report_assembles_all_sources(self) -> None:
        incident = _incident(zone="Zone-A")
        service = IncidentReportService(
            generator=IncidentReportGenerator(),
            incident_repository=_StubIncidentRepository({incident.id: incident}),
            compound_risk=_StubCompoundRisk([_compound_risk_result("Zone-A")]),
            emergency_response=_StubEmergencyResponse([_emergency_result("Zone-A")]),
            compliance=_StubCompliance(_compliance_result(incident)),
        )

        report = service.generate_report(incident.id)

        assert report is not None
        assert report.summary.incident_id == str(incident.id)
        assert len(report.detected_risks) == 1
        assert len(report.emergency_actions) == 1
        assert len(report.compliance_notes) == 1

    def test_generate_report_works_with_no_engine_ports(self) -> None:
        incident = _incident()
        service = IncidentReportService(
            generator=IncidentReportGenerator(),
            incident_repository=_StubIncidentRepository({incident.id: incident}),
        )

        report = service.generate_report(incident.id)

        assert report is not None
        assert report.detected_risks == []
        assert report.emergency_actions == []
        assert report.compliance_notes == []

    def test_generate_latest_report_returns_none_when_no_incidents(self) -> None:
        service = IncidentReportService(
            generator=IncidentReportGenerator(), incident_repository=_StubIncidentRepository({})
        )
        assert service.generate_latest_report() is None

    def test_generate_latest_report_picks_most_recently_occurred_incident(self) -> None:
        older = _incident(zone="Zone-A")
        object.__setattr__(older, "occurred_at", datetime(2026, 7, 1, 0, 0, tzinfo=UTC))
        newer = _incident(zone="Zone-B")
        object.__setattr__(newer, "occurred_at", datetime(2026, 7, 10, 0, 0, tzinfo=UTC))
        service = IncidentReportService(
            generator=IncidentReportGenerator(),
            incident_repository=_StubIncidentRepository({older.id: older, newer.id: newer}),
        )

        report = service.generate_latest_report()

        assert report is not None
        assert report.summary.incident_id == str(newer.id)
