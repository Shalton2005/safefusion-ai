"""Response schemas for the Incident Report Generator.

JSON output only — no PDF rendering. Field names and section grouping
mirror ``src.services.incident_report.schemas`` exactly (Summary,
Timeline, Detected Risks, Triggered Rules, Emergency Actions, Compliance
Notes) so the API response is a direct, structured representation of the
report.
"""

from datetime import datetime

from src.models.enums import ComplianceStatus, IncidentType, RiskLevel, SeverityLevel
from src.schemas.base import AppBaseModel


class ReportSummaryResponse(AppBaseModel):
    incident_id: str
    zone: str
    incident_type: IncidentType
    severity: SeverityLevel
    description: str
    root_cause: str | None


class TimelineEventResponse(AppBaseModel):
    timestamp: datetime
    label: str
    description: str


class DetectedRiskResponse(AppBaseModel):
    zone: str
    risk_score: float
    risk_level: RiskLevel
    explanation: str


class TriggeredRuleResponse(AppBaseModel):
    rule_name: str
    points: float
    explanation: str


class EmergencyActionEntryResponse(AppBaseModel):
    action: str
    triggered_by_rule: str
    explanation: str


class ComplianceNoteResponse(AppBaseModel):
    rule_code: str
    framework: str
    title: str
    description: str
    recommendation: str


class IncidentReportResponse(AppBaseModel):
    """Structured incident report — the six required sections, JSON only."""

    summary: ReportSummaryResponse
    timeline: list[TimelineEventResponse]
    detected_risks: list[DetectedRiskResponse]
    triggered_rules: list[TriggeredRuleResponse]
    emergency_actions: list[EmergencyActionEntryResponse]
    compliance_notes: list[ComplianceNoteResponse]
    compliance_status: ComplianceStatus | None
