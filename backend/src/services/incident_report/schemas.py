"""Dataclasses shared by the Incident Report Generator and service.

The report is a fixed set of six sections — Summary, Timeline, Detected
Risks, Triggered Rules, Emergency Actions, Compliance Notes — assembled
purely from already-computed data (the Incident record, and optionally
Compound Risk / Emergency Response / Compliance engine output for the
same zone/incident). No AI/ML, no PDF rendering: this module only builds
plain, JSON-serializable dataclasses.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from src.models.enums import ComplianceStatus, IncidentType, RiskLevel, SeverityLevel


@dataclass(frozen=True)
class ReportSummary:
    """High-level overview of the incident."""

    incident_id: str
    zone: str
    incident_type: IncidentType
    severity: SeverityLevel
    description: str
    root_cause: str | None


@dataclass(frozen=True)
class TimelineEvent:
    """A single timestamped event in the incident's lifecycle."""

    timestamp: datetime
    label: str
    description: str


@dataclass(frozen=True)
class DetectedRisk:
    """A zone-level compound risk finding relevant to this incident."""

    zone: str
    risk_score: float
    risk_level: RiskLevel
    explanation: str


@dataclass(frozen=True)
class TriggeredRule:
    """A single rule that fired while detecting risk for this incident's zone."""

    rule_name: str
    points: float
    explanation: str


@dataclass(frozen=True)
class EmergencyActionEntry:
    """A single emergency action dispatched for this incident's zone."""

    action: str
    triggered_by_rule: str
    explanation: str


@dataclass(frozen=True)
class ComplianceNote:
    """A single compliance rule violated by this incident."""

    rule_code: str
    framework: str
    title: str
    description: str
    recommendation: str


@dataclass(frozen=True)
class IncidentReport:
    """The complete structured incident report, JSON-serializable as-is.

    Every field is populated purely from rule-based engine output —
    ``triggered_rules``/``detected_risks``/``emergency_actions`` are
    empty lists (not omitted) when no matching zone data was supplied,
    so the section is always present in the JSON output even if empty.
    """

    summary: ReportSummary
    timeline: list[TimelineEvent]
    detected_risks: list[DetectedRisk]
    triggered_rules: list[TriggeredRule]
    emergency_actions: list[EmergencyActionEntry]
    compliance_notes: list[ComplianceNote]
    # ``None`` when no ComplianceRuleEngine result was supplied for this
    # incident, as opposed to ``COMPLIANT`` which means compliance *was*
    # evaluated and found no violations.
    compliance_status: ComplianceStatus | None = None
