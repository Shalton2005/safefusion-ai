"""Incident Report routes for SafeFusion AI API v1.

Thin Route -> Service -> Repository endpoint exposing the Incident Report
Generator, which assembles a structured, six-section JSON report
(Summary, Timeline, Detected Risks, Triggered Rules, Emergency Actions,
Compliance Notes) for a single incident. Purely rule-based — no AI/ML,
no PDF generation.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.incident import IncidentRepository
from src.routes.compliance import get_compliance_service
from src.routes.emergency_response import get_emergency_response_service
from src.routes.monitoring import get_compound_risk_service
from src.schemas.response.incident_report import (
    ComplianceNoteResponse,
    DetectedRiskResponse,
    EmergencyActionEntryResponse,
    IncidentReportResponse,
    ReportSummaryResponse,
    TimelineEventResponse,
    TriggeredRuleResponse,
)
from src.services.compliance.compliance_service import ComplianceService
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.emergency_response.emergency_response_service import EmergencyResponseService
from src.services.incident_report.generator import IncidentReportGenerator
from src.services.incident_report.incident_report_service import IncidentReportService
from src.services.incident_report.schemas import IncidentReport

router: APIRouter = APIRouter(prefix="/incident-reports", tags=["Incident Reports"])

DbDep = Annotated[Session, Depends(get_db)]


def get_incident_report_service(
    db: DbDep,
    compound_risk_service: Annotated[CompoundRiskService, Depends(get_compound_risk_service)],
    emergency_response_service: Annotated[EmergencyResponseService, Depends(get_emergency_response_service)],
    compliance_service: Annotated[ComplianceService, Depends(get_compliance_service)],
) -> IncidentReportService:
    """Create the incident report service with the generator and all three engines wired in."""
    return IncidentReportService(
        generator=IncidentReportGenerator(),
        incident_repository=IncidentRepository(db),
        compound_risk=compound_risk_service,
        emergency_response=emergency_response_service,
        compliance=compliance_service,
    )


IncidentReportServiceDep = Annotated[IncidentReportService, Depends(get_incident_report_service)]


def _to_response(report: IncidentReport) -> IncidentReportResponse:
    return IncidentReportResponse(
        summary=ReportSummaryResponse(
            incident_id=report.summary.incident_id,
            zone=report.summary.zone,
            incident_type=report.summary.incident_type,
            severity=report.summary.severity,
            description=report.summary.description,
            root_cause=report.summary.root_cause,
        ),
        timeline=[
            TimelineEventResponse(timestamp=event.timestamp, label=event.label, description=event.description)
            for event in report.timeline
        ],
        detected_risks=[
            DetectedRiskResponse(
                zone=risk.zone,
                risk_score=risk.risk_score,
                risk_level=risk.risk_level,
                explanation=risk.explanation,
            )
            for risk in report.detected_risks
        ],
        triggered_rules=[
            TriggeredRuleResponse(rule_name=rule.rule_name, points=rule.points, explanation=rule.explanation)
            for rule in report.triggered_rules
        ],
        emergency_actions=[
            EmergencyActionEntryResponse(
                action=entry.action,
                triggered_by_rule=entry.triggered_by_rule,
                explanation=entry.explanation,
            )
            for entry in report.emergency_actions
        ],
        compliance_notes=[
            ComplianceNoteResponse(
                rule_code=note.rule_code,
                framework=note.framework,
                title=note.title,
                description=note.description,
                recommendation=note.recommendation,
            )
            for note in report.compliance_notes
        ],
        compliance_status=report.compliance_status,
    )


@router.get(
    "/{incident_id}",
    summary="Generate a structured incident report",
    description=(
        "Assembles a structured, six-section JSON incident report — "
        "Summary, Timeline, Detected Risks, Triggered Rules, Emergency "
        "Actions, Compliance Notes — for a single incident by combining "
        "the incident record with the latest Compound Risk, Emergency "
        "Response, and Compliance engine output for its zone. Purely "
        "rule-based; JSON output only, no PDF generation."
    ),
    response_model=IncidentReportResponse,
    response_description="Structured incident report.",
)
def generate_incident_report(
    incident_id: Annotated[uuid.UUID, Path(description="Unique identifier of the incident to report on.")],
    service: IncidentReportServiceDep,
) -> IncidentReportResponse:
    report = service.generate_report(incident_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return _to_response(report)
