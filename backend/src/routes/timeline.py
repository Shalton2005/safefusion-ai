"""Event Timeline routes for SafeFusion AI API v1.

Thin Route -> Service -> Repository endpoints exposing the chronological
platform event timeline: every event published on the Unified Event Bus
(sensors, workers, permits, maintenance, and future producers), each
carrying its source, severity, timestamp, and (when available) a link to
the AI decision that produced or responded to it.
"""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.models.enums import SeverityLevel
from src.repositories.timeline_event import TimelineEventRepository
from src.schemas.response.timeline import TimelineRecordResponse, TimelineResultResponse
from src.services.timeline.service import TimelineService

router: APIRouter = APIRouter(prefix="/timeline", tags=["Timeline"])

DbDep = Annotated[Session, Depends(get_db)]


def get_timeline_service(db: DbDep) -> TimelineService:
    """Create a service instance with repository dependencies."""
    return TimelineService(repository=TimelineEventRepository(db))


TimelineServiceDep = Annotated[TimelineService, Depends(get_timeline_service)]


@router.get(
    "",
    summary="Get the chronological event timeline",
    description=(
        "Retrieve a paginated, newest-first slice of every platform event — "
        "published by sensors, workers, permits, maintenance, or any future "
        "producer on the Unified Event Bus — each carrying its source, "
        "severity, timestamp, and linked AI decision reference (if any). "
        "Every filter is optional and additive."
    ),
    response_model=TimelineResultResponse,
    response_description="Paginated, filtered timeline slice.",
)
def get_timeline(
    service: TimelineServiceDep,
    skip: int = Query(0, ge=0, description="Number of timeline records to skip before returning results.", examples=[0]),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of timeline records to return.", examples=[100]),
    source: str | None = Query(
        None, description="Filter to events from this publishing module (e.g. 'sensor', 'worker', 'permit', 'maintenance')."
    ),
    severity: SeverityLevel | None = Query(None, description="Filter to events classified at this severity."),
    zone: str | None = Query(None, description="Filter to events concerning this plant zone."),
    correlation_id: str | None = Query(None, description="Filter to events sharing this correlation id."),
    has_ai_decision: bool | None = Query(
        None, description="When true, only events linked to an AI decision; when false, only events without one."
    ),
    occurred_after: datetime | None = Query(None, description="Only events that occurred strictly after this instant."),
    occurred_before: datetime | None = Query(None, description="Only events that occurred strictly before this instant."),
) -> TimelineResultResponse:
    filters: dict = {
        "source": source,
        "severity": severity,
        "zone": zone,
        "correlation_id": correlation_id,
        "has_ai_decision": has_ai_decision,
        "occurred_after": occurred_after,
        "occurred_before": occurred_before,
    }
    records = service.list_timeline(skip=skip, limit=limit, **filters)
    total_count = service.count_timeline(**filters)
    return TimelineResultResponse(
        total_count=total_count,
        skip=skip,
        limit=limit,
        records=[TimelineRecordResponse.model_validate(record) for record in records],
    )


@router.get(
    "/by-event/{event_id}",
    summary="Get a timeline record by its originating event id",
    description="Retrieve the single timeline record projected from the given Unified Event Bus event id.",
    response_model=TimelineRecordResponse,
    response_description="The matching timeline record.",
)
def get_timeline_record_by_event_id(
    service: TimelineServiceDep,
    event_id: Annotated[uuid.UUID, Path(description="The originating Event.event_id to look up.")],
) -> TimelineRecordResponse:
    record = service.get_by_event_id(event_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No timeline record found for event_id '{event_id}'.",
        )
    return TimelineRecordResponse.model_validate(record)
