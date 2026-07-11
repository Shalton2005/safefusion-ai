"""Response schemas for the Compliance Rule Engine."""

from src.models.enums import ComplianceFramework, ComplianceStatus
from src.schemas.base import AppBaseModel


class ComplianceViolationResponse(AppBaseModel):
    """A single compliance rule violated by an evaluated incident."""

    rule_code: str
    framework: ComplianceFramework
    title: str
    description: str
    recommendation: str
    citations: list[str]


class IncidentComplianceResultResponse(AppBaseModel):
    """Computed compliance outcome for a single evaluated incident."""

    incident_id: str
    status: ComplianceStatus
    violated_frameworks: list[ComplianceFramework]
    violations: list[ComplianceViolationResponse]
    recommendations: list[str]


class ComplianceEvaluationResultResponse(AppBaseModel):
    """Result payload for a compliance evaluation run across one or more incidents."""

    incident_count: int
    non_compliant_count: int
    results: list[IncidentComplianceResultResponse]
