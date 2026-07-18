"""Response schemas for the Event Timeline Service."""

import uuid
from datetime import datetime
from typing import Any

from src.models.enums import SeverityLevel
from src.schemas.base import AppBaseModel


class TimelineRecordResponse(AppBaseModel):
    """One chronologically-ordered platform event."""

    id: uuid.UUID
    event_id: uuid.UUID
    source: str
    event_type: str
    severity: SeverityLevel
    zone: str | None
    payload: dict[str, Any]
    correlation_id: str | None
    ai_decision_reference: str | None
    occurred_at: datetime
    recorded_at: datetime


class TimelineResultResponse(AppBaseModel):
    """Paginated timeline query result."""

    total_count: int
    skip: int
    limit: int
    records: list[TimelineRecordResponse]
