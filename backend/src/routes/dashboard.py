"""
Dashboard aggregation routes for SafeFusion AI API v1.

Assembles summary statistics from multiple repositories into
a single response optimized for dashboard rendering.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.models.enums import SensorStatus, WorkerStatus
from src.repositories.alert import AlertRepository
from src.repositories.permit import PermitRepository
from src.repositories.risk_score import RiskScoreRepository
from src.repositories.sensor import SensorRepository
from src.repositories.worker import WorkerRepository
from src.schemas.dashboard import (
    DashboardResponse,
    DashboardSummary,
    ZoneOverviewResponse,
    ZoneOverviewSummary,
    ZoneSensorSummary,
)
from src.utils.response import success_response

router: APIRouter = APIRouter(prefix="/dashboard", tags=["Dashboard"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    summary="Full dashboard payload",
    description=(
        "Returns aggregated summary statistics and per-zone sensor breakdowns "
        "for the main monitoring dashboard."
    ),
    response_class=JSONResponse,
    response_description="Dashboard summary and per-zone monitoring breakdown.",
)
def get_dashboard(db: DbDep) -> JSONResponse:
    """Assemble and return the full dashboard payload."""
    worker_repo = WorkerRepository(db)
    sensor_repo = SensorRepository(db)
    alert_repo = AlertRepository(db)
    permit_repo = PermitRepository(db)
    risk_repo = RiskScoreRepository(db)

    # ── Summary counters ──────────────────────────────────────────────────────
    latest_risk = risk_repo.get_latest()

    summary = DashboardSummary(
        total_workers=worker_repo.count(),
        active_workers=worker_repo.count_by_status(WorkerStatus.WORKING),
        active_alerts=alert_repo.count_active(),
        critical_alerts=alert_repo.count_critical_active(),
        active_permits=permit_repo.count_active(),
        overall_risk_score=latest_risk.risk_score if latest_risk else None,
        overall_risk_level=latest_risk.risk_level if latest_risk else None,
    )

    # ── Per-zone sensor breakdown ─────────────────────────────────────────────
    zones = sensor_repo.get_distinct_zones()
    zone_summaries: list[ZoneSensorSummary] = []

    for zone in zones:
        normal = sensor_repo.count_by_zone_and_status(zone, SensorStatus.NORMAL)
        warning = sensor_repo.count_by_zone_and_status(zone, SensorStatus.WARNING)
        critical = sensor_repo.count_by_zone_and_status(zone, SensorStatus.CRITICAL)

        if critical > 0:
            plant_status = "Critical"
        elif warning > 0:
            plant_status = "Warning"
        else:
            plant_status = "Safe"

        zone_summaries.append(
            ZoneSensorSummary(
                zone=zone,
                normal_count=normal,
                warning_count=warning,
                critical_count=critical,
                plant_status=plant_status,
            )
        )

    payload = DashboardResponse(summary=summary, zones=zone_summaries)

    return success_response(
        data=payload.model_dump(mode="json"),
        message="Dashboard data retrieved.",
    )


@router.get(
    "/zones",
    summary="Zone overview",
    description=(
        "Returns, for every known plant zone, the current worker count, active "
        "sensor count, active permit count, and current risk level — the data "
        "backing the Zone Overview component. Every value is computed "
        "server-side from persisted records."
    ),
    response_class=JSONResponse,
    response_description="Per-zone overview: presence, active sensors/permits, and risk level.",
)
def get_zone_overview(db: DbDep) -> JSONResponse:
    """Assemble and return the per-zone overview payload."""
    worker_repo = WorkerRepository(db)
    sensor_repo = SensorRepository(db)
    permit_repo = PermitRepository(db)
    risk_repo = RiskScoreRepository(db)

    # Union every zone referenced by any domain entity — a zone with permits
    # but no sensors yet (or vice versa) should still appear.
    zones = sorted(
        set(worker_repo.get_distinct_zones())
        | set(sensor_repo.get_distinct_zones())
        | set(permit_repo.get_distinct_zones())
    )

    zone_summaries: list[ZoneOverviewSummary] = []
    for zone in zones:
        latest_risk = risk_repo.get_latest_by_zone(zone)
        zone_summaries.append(
            ZoneOverviewSummary(
                zone=zone,
                workers_present=worker_repo.count_by_zone(zone),
                active_sensors=sensor_repo.count_by_zone(zone),
                active_permits=permit_repo.count_active_by_zone(zone),
                risk_level=latest_risk.risk_level if latest_risk else None,
            )
        )

    payload = ZoneOverviewResponse(zones=zone_summaries)

    return success_response(
        data=payload.model_dump(mode="json"),
        message="Zone overview retrieved.",
    )


@router.get(
    "/summary",
    summary="Dashboard quick stats",
    description="Returns lightweight summary counters for dashboard cards only.",
    response_class=JSONResponse,
    response_description="Dashboard summary counters.",
)
def get_dashboard_summary(db: DbDep) -> JSONResponse:
    """Return summary counters without zone-level sensor breakdown."""
    worker_repo = WorkerRepository(db)
    alert_repo = AlertRepository(db)
    permit_repo = PermitRepository(db)
    risk_repo = RiskScoreRepository(db)

    latest_risk = risk_repo.get_latest()

    summary = DashboardSummary(
        total_workers=worker_repo.count(),
        active_workers=worker_repo.count_by_status(WorkerStatus.WORKING),
        active_alerts=alert_repo.count_active(),
        critical_alerts=alert_repo.count_critical_active(),
        active_permits=permit_repo.count_active(),
        overall_risk_score=latest_risk.risk_score if latest_risk else None,
        overall_risk_level=latest_risk.risk_level if latest_risk else None,
    )

    return success_response(
        data=summary.model_dump(mode="json"),
        message="Dashboard summary retrieved.",
    )
