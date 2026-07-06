"""
Pydantic v2 schemas for the Dashboard aggregation API.

These schemas represent composite read-only views assembled from
multiple domain repositories at request time.
"""

from src.schemas.base import AppBaseModel


class DashboardSummary(AppBaseModel):
    """Quick-stat counters displayed on dashboard cards."""

    total_workers: int
    active_workers: int
    active_alerts: int
    critical_alerts: int
    active_permits: int
    overall_risk_score: float | None = None
    overall_risk_level: str | None = None


class ZoneSensorSummary(AppBaseModel):
    """Per-zone sensor reading status breakdown."""

    zone: str
    normal_count: int
    warning_count: int
    critical_count: int
    plant_status: str  # "Safe" | "Warning" | "Critical"


class DashboardResponse(AppBaseModel):
    """Full dashboard payload returned by ``GET /api/v1/dashboard``."""

    summary: DashboardSummary
    zones: list[ZoneSensorSummary]
