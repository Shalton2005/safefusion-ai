"""Incident (singular) routes for SafeFusion AI API v1.

Thin read-only endpoint returning the structured report for the most
recently occurred incident. Reuses the same
``IncidentReportService``/``IncidentReportGenerator`` as
``GET /incident-reports/{incident_id}`` — this route simply looks up the
latest incident instead of requiring an id in the path.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.incident import IncidentRepository
from src.routes.compliance import get_compliance_service
from src.routes.emergency_response import get_emergency_response_service
from src.routes.incident_reports import _to_response
from src.routes.monitoring import get_compound_risk_service
from src.schemas.response.incident_report import IncidentReportResponse
from src.services.compliance.compliance_service import ComplianceService
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.emergency_response.emergency_response_service import EmergencyResponseService
from src.services.incident_report.generator import IncidentReportGenerator
from src.services.incident_report.incident_report_service import IncidentReportService

router: APIRouter = APIRouter(prefix="/incident", tags=["Incident Reports"])

DbDep = Annotated[Session, Depends(get_db)]


def get_incident_report_service_for_latest(
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


IncidentReportServiceDep = Annotated[
    IncidentReportService, Depends(get_incident_report_service_for_latest)
]


@router.get(
    "/report",
    summary="Generate a structured report for the most recent incident",
    description=(
        "Assembles a structured, six-section JSON incident report — "
        "Summary, Timeline, Detected Risks, Triggered Rules, Emergency "
        "Actions, Compliance Notes — for the most recently occurred "
        "incident. For a specific incident, use "
        "GET /incident-reports/{incident_id} instead."
    ),
    response_model=IncidentReportResponse,
    response_description="Structured incident report for the most recent incident.",
)
def get_latest_incident_report(
    service: IncidentReportServiceDep,
) -> IncidentReportResponse:
    report = service.generate_latest_report()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No incidents recorded yet.")
    return _to_response(report)
