"""Response schemas for the GET /compliance/status endpoint."""

from src.models.enums import ComplianceFramework, ComplianceStatus
from src.schemas.base import AppBaseModel


class ComplianceStatusResponse(AppBaseModel):
    """Plant-wide compliance status snapshot across all detected incidents."""

    status: ComplianceStatus
    incident_count: int
    non_compliant_count: int
    violated_frameworks: list[ComplianceFramework]
