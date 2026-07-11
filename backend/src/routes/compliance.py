"""Compliance routes for SafeFusion AI API v1.

Thin Route -> Service -> Repository endpoints exposing the Compliance
Rule Engine, which evaluates detected incidents against predefined
regulatory rules (Factory Act, OISD, DGMS) and returns compliance status,
violated rules, and recommendations.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from src.config.compliance_rules import COMPLIANCE_RULES
from src.database.session import get_db
from src.repositories.incident import IncidentRepository
from src.schemas.response.compliance import (
    ComplianceEvaluationResultResponse,
    ComplianceViolationResponse,
    IncidentComplianceResultResponse,
)
from src.services.compliance.compliance_service import ComplianceService
from src.services.compliance.engine import ComplianceRuleEngine
from src.services.compliance.rules import IncidentAttributeComplianceRule
from src.services.compliance.schemas import IncidentComplianceResult

router: APIRouter = APIRouter(prefix="/compliance", tags=["Compliance"])

DbDep = Annotated[Session, Depends(get_db)]


def _build_compliance_engine() -> ComplianceRuleEngine:
    """Build the Compliance Rule Engine from the centralised rule registry.

    ``knowledge_source`` is left at its default (``NullKnowledgeSource`` —
    no citations) until a RAG-backed implementation is wired in; swapping
    it in later requires no change here beyond passing it to the engine.
    """
    return ComplianceRuleEngine(
        rules=[IncidentAttributeComplianceRule(config) for config in COMPLIANCE_RULES.values()],
    )


def get_compliance_service(db: DbDep) -> ComplianceService:
    """Create the compliance service with the engine and incident repository wired in."""
    return ComplianceService(
        engine=_build_compliance_engine(),
        incident_repository=IncidentRepository(db),
    )


ComplianceServiceDep = Annotated[ComplianceService, Depends(get_compliance_service)]


def _to_response(result: IncidentComplianceResult) -> IncidentComplianceResultResponse:
    return IncidentComplianceResultResponse(
        incident_id=result.incident_id,
        status=result.status,
        violated_frameworks=result.violated_frameworks,
        violations=[
            ComplianceViolationResponse(
                rule_code=violation.rule_code,
                framework=violation.framework,
                title=violation.title,
                description=violation.description,
                recommendation=violation.recommendation,
                citations=list(violation.citations),
            )
            for violation in result.violations
        ],
        recommendations=result.recommendations,
    )


@router.get(
    "/incidents/{incident_id}",
    summary="Evaluate a single incident for compliance",
    description="Evaluates one detected incident against Factory Act, OISD, and DGMS compliance rules.",
    response_model=IncidentComplianceResultResponse,
    response_description="Compliance status, violated rules, and recommendations for the incident.",
)
def evaluate_incident_compliance(
    incident_id: Annotated[uuid.UUID, Path(description="Unique identifier of the incident to evaluate.")],
    service: ComplianceServiceDep,
) -> IncidentComplianceResultResponse:
    result = service.evaluate_incident_by_id(incident_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return _to_response(result)


@router.post(
    "/evaluate",
    summary="Evaluate all detected incidents for compliance",
    description=(
        "Runs the Compliance Rule Engine across a paginated set of detected "
        "incidents and returns compliance status, violated rules, and "
        "recommendations for each."
    ),
    response_model=ComplianceEvaluationResultResponse,
    response_description="Compliance evaluation results for the evaluated incidents.",
)
def evaluate_compliance(
    service: ComplianceServiceDep,
    skip: int = Query(0, ge=0, description="Number of incident records to skip before evaluating.", examples=[0]),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of incident records to evaluate.", examples=[100]),
) -> ComplianceEvaluationResultResponse:
    results = service.evaluate_all_incidents(skip=skip, limit=limit)
    responses = [_to_response(result) for result in results]
    return ComplianceEvaluationResultResponse(
        incident_count=len(responses),
        non_compliant_count=sum(1 for r in responses if r.violations),
        results=responses,
    )
