"""Incident Report Generator for SafeFusion AI.

Assembles a structured, six-section incident report (Summary, Timeline,
Detected Risks, Triggered Rules, Emergency Actions, Compliance Notes)
from an ``Incident`` record plus optional Compound Risk, Emergency
Response, and Compliance engine output. Purely rule-based templating —
no AI/ML, no PDF generation. Compound Risk / Emergency Response results
are matched to the incident by zone (``result.zone == incident.zone``);
Compliance results are matched by incident id.
"""

from __future__ import annotations

from src.models.incident import Incident
from src.services.compliance.schemas import IncidentComplianceResult
from src.services.compound_risk.schemas import ZoneCompoundRiskResult
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult
from src.services.incident_report.schemas import (
    ComplianceNote,
    DetectedRisk,
    EmergencyActionEntry,
    IncidentReport,
    ReportSummary,
    TimelineEvent,
    TriggeredRule,
)


class IncidentReportGenerator:
    """Builds an ``IncidentReport`` from an incident and optional engine output."""

    def generate(
        self,
        incident: Incident,
        compound_risk_results: list[ZoneCompoundRiskResult] | None = None,
        emergency_response_results: list[ZoneEmergencyResponseResult] | None = None,
        compliance_result: IncidentComplianceResult | None = None,
    ) -> IncidentReport:
        """Assemble the six-section report for one incident.

        Args:
            incident: The incident this report describes.
            compound_risk_results: Compound Risk Engine output; entries
                are included if their ``zone`` matches ``incident.zone``.
            emergency_response_results: Emergency Response Engine output;
                entries are included if their ``zone`` matches
                ``incident.zone``.
            compliance_result: Compliance Rule Engine output for this
                specific incident (already matched by the caller, e.g.
                via ``ComplianceService.evaluate_incident``).
        """
        zone_risks = [
            result for result in (compound_risk_results or []) if result.zone == incident.zone
        ]
        zone_actions = [
            result for result in (emergency_response_results or []) if result.zone == incident.zone
        ]

        return IncidentReport(
            summary=self._build_summary(incident),
            timeline=self._build_timeline(incident, zone_actions),
            detected_risks=self._build_detected_risks(zone_risks),
            triggered_rules=self._build_triggered_rules(zone_risks),
            emergency_actions=self._build_emergency_actions(zone_actions),
            compliance_notes=self._build_compliance_notes(compliance_result),
            compliance_status=compliance_result.status if compliance_result else None,
        )

    def _build_summary(self, incident: Incident) -> ReportSummary:
        return ReportSummary(
            incident_id=str(incident.id),
            zone=incident.zone,
            incident_type=incident.incident_type,
            severity=incident.severity,
            description=incident.description,
            root_cause=incident.root_cause,
        )

    def _build_timeline(
        self, incident: Incident, zone_actions: list[ZoneEmergencyResponseResult]
    ) -> list[TimelineEvent]:
        events = [
            TimelineEvent(
                timestamp=incident.occurred_at,
                label="incident_occurred",
                description=f"Incident occurred in zone '{incident.zone}'.",
            ),
            TimelineEvent(
                timestamp=incident.created_at,
                label="incident_logged",
                description="Incident record created in SafeFusion AI.",
            ),
        ]
        if incident.updated_at != incident.created_at:
            events.append(
                TimelineEvent(
                    timestamp=incident.updated_at,
                    label="incident_updated",
                    description="Incident record last updated.",
                )
            )
        # Emergency actions have no independent timestamp of their own in
        # the engine output, so they're anchored to incident detection
        # time and ordered after it — they represent the response that
        # followed detection, not a separately timed event.
        for result in zone_actions:
            for match in result.actions:
                events.append(
                    TimelineEvent(
                        timestamp=incident.created_at,
                        label=f"emergency_action:{match.action.value}",
                        description=match.explanation,
                    )
                )
        events.sort(key=lambda event: event.timestamp)
        return events

    def _build_detected_risks(self, zone_risks: list[ZoneCompoundRiskResult]) -> list[DetectedRisk]:
        return [
            DetectedRisk(
                zone=result.zone,
                risk_score=result.risk_score,
                risk_level=result.risk_level,
                explanation=result.explanation,
            )
            for result in zone_risks
        ]

    def _build_triggered_rules(self, zone_risks: list[ZoneCompoundRiskResult]) -> list[TriggeredRule]:
        return [
            TriggeredRule(rule_name=match.rule_name, points=match.points, explanation=match.explanation)
            for result in zone_risks
            for match in result.triggered_rules
        ]

    def _build_emergency_actions(
        self, zone_actions: list[ZoneEmergencyResponseResult]
    ) -> list[EmergencyActionEntry]:
        return [
            EmergencyActionEntry(
                action=match.action.value,
                triggered_by_rule=match.triggered_by_rule,
                explanation=match.explanation,
            )
            for result in zone_actions
            for match in result.actions
        ]

    def _build_compliance_notes(
        self, compliance_result: IncidentComplianceResult | None
    ) -> list[ComplianceNote]:
        if compliance_result is None:
            return []
        return [
            ComplianceNote(
                rule_code=violation.rule_code,
                framework=violation.framework.value,
                title=violation.title,
                description=violation.description,
                recommendation=violation.recommendation,
            )
            for violation in compliance_result.violations
        ]
