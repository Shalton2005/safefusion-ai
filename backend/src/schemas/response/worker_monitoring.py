"""Response schemas for worker monitoring summaries."""

import uuid
from datetime import datetime

from src.models.enums import WorkerStatus
from src.schemas.base import AppBaseModel


class WorkerMonitoringStatusCounts(AppBaseModel):
    """Count summary grouped by worker operational status."""

    working: int
    idle: int
    emergency: int
    total: int


class WorkerMonitoringItem(AppBaseModel):
    """Single worker monitoring snapshot row."""

    worker_id: uuid.UUID
    employee_id: str
    name: str
    assigned_zone: str | None
    simulated_location: str
    active_permit_id: uuid.UUID | None
    active_permit_type: str | None
    shift: str
    ppe_status_placeholder: bool
    current_status: WorkerStatus


class WorkerMonitoringSummaryResponse(AppBaseModel):
    """Top-level worker monitoring summary payload."""

    generated_at: datetime
    total_workers: int
    workers_with_active_permit: int
    counts: WorkerMonitoringStatusCounts
    workers: list[WorkerMonitoringItem]