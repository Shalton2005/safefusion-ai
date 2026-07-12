"""Incident Report Generator package for SafeFusion AI.

Assembles a structured, six-section incident report (Summary, Timeline,
Detected Risks, Triggered Rules, Emergency Actions, Compliance Notes)
from an Incident record plus Compound Risk, Emergency Response, and
Compliance engine output. Purely rule-based, JSON output only — no
AI/ML, no PDF generation.
"""

from src.services.incident_report.generator import IncidentReportGenerator
from src.services.incident_report.incident_report_service import IncidentReportService
from src.services.incident_report.schemas import (
    ComplianceNote,
    DetectedRisk,
    EmergencyActionEntry,
    IncidentReport,
    ReportSummary,
    TimelineEvent,
    TriggeredRule,
)

__all__ = [
    "IncidentReportGenerator",
    "IncidentReportService",
    "ComplianceNote",
    "DetectedRisk",
    "EmergencyActionEntry",
    "IncidentReport",
    "ReportSummary",
    "TimelineEvent",
    "TriggeredRule",
]
