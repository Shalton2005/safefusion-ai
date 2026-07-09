"""Response schemas for permit validation summaries."""

import uuid
from datetime import datetime

from src.models.enums import PermitStatus, PermitType, PermitValidationState
from src.schemas.base import AppBaseModel


class PermitValidationCounts(AppBaseModel):
    """Summary counts by permit validation state."""

    valid: int
    expired: int
    pending: int
    invalid: int
    total: int


class PermitValidationItem(AppBaseModel):
    """Validation result for a single permit."""

    permit_id: uuid.UUID
    permit_type: PermitType
    zone: str
    status: PermitStatus
    start_time: datetime
    end_time: datetime
    validation_state: PermitValidationState
    reason: str


class PermitValidationSummaryResponse(AppBaseModel):
    """Top-level structured permit validation summary."""

    generated_at: datetime
    counts: PermitValidationCounts
    permits: list[PermitValidationItem]