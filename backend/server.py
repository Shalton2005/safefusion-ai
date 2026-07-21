"""
SafeFusion AI — Application entry point.

This module constructs the FastAPI application via :func:`create_application`
and exposes the ``app`` instance that ASGI servers (Uvicorn, Gunicorn) bind to.

Starting the server
-------------------
Development (auto-reload)::

    uvicorn server:app --reload --host 0.0.0.0 --port 8000

Production (direct)::

    python server.py

API Documentation
-----------------
Once running, the interactive API documentation is available at:
    - Swagger UI : http://localhost:8000/docs
    - ReDoc      : http://localhost:8000/redoc
    - OpenAPI    : http://localhost:8000/openapi.json
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi import Depends

from src.config.settings import settings
from src.graph_database.driver import close_driver, ensure_constraints
from src.middleware.auth import get_current_user
from src.middleware.exception_handler import API_ERROR_RESPONSES, register_exception_handlers
from src.middleware.logging_middleware import RequestLoggingMiddleware
from src.routes import ai_copilot as ai_copilot_router
from src.routes import ai_monitoring as ai_monitoring_router
from src.routes import alerts as alerts_router
from src.routes import auth as auth_router
from src.routes import compliance as compliance_router
from src.routes import computer_vision as computer_vision_router
from src.routes import dashboard as dashboard_router
from src.routes import analytics as analytics_router
from src.routes import demo as demo_router
from src.routes import emergency as emergency_router
from src.routes import emergency_response as emergency_response_router
from src.routes import graph as graph_router
from src.routes import health as health_router
from src.routes import incident as incident_router
from src.routes import incident_reports as incident_reports_router
from src.routes import incidents as incidents_router
from src.routes import maintenance as maintenance_router
from src.routes import media as media_router
from src.routes import monitoring as monitoring_router
from src.routes import permits as permits_router
from src.routes import rag as rag_router
from src.routes import recommendations as recommendations_router
from src.routes import risk_scores as risk_scores_router
from src.routes import root as root_router
from src.routes import sensor_simulator as sensor_simulator_router
from src.routes import sensors as sensors_router
from src.routes import status as status_router
from src.routes import timeline as timeline_router
from src.routes import workers as workers_router
from src.services.event_bus.bus import get_default_dispatcher
from src.services.scenario_playback.runner import get_scenario_playback_runner
from src.services.timeline.subscriber import register_timeline_subscriber
from src.utils.logger import configure_logging, get_logger


configure_logging(debug=settings.DEBUG)
logger = get_logger(__name__)


OPENAPI_TAGS_METADATA = [
    {"name": "Root", "description": "Top-level API discovery and version information."},
    {"name": "Health", "description": "Liveness and process-health probes for infrastructure checks."},
    {"name": "Authentication", "description": "Account registration, login, and JWT access/refresh token issuance."},
    {"name": "Status", "description": "High-level operational status of the backend and database configuration layer."},
    {"name": "Dashboard", "description": "Aggregated operational metrics and monitoring summaries for the main dashboard."},
    {"name": "Workers", "description": "Worker registry and on-site personnel management endpoints."},
    {"name": "Sensors", "description": "Industrial sensor readings collected from IoT and SCADA inputs."},
    {"name": "Sensor Simulator", "description": "Generates realistic simulated industrial telemetry (gas, temperature, pressure, humidity, vibration) for demos and testing."},
    {"name": "Permits", "description": "Permit-to-Work records for controlled safety-critical tasks."},
    {"name": "Maintenance", "description": "Maintenance activity records for equipment and plant assets."},
    {"name": "Incidents", "description": "Historical and simulated incident records for investigation and analytics."},
    {"name": "Alerts", "description": "Safety alerts generated from operational monitoring and risk analysis."},
    {"name": "Risk Scores", "description": "Risk assessment records used to monitor zone-level exposure and safety posture."},
    {"name": "Monitoring", "description": "Unified sensor, worker, permit, and risk monitoring summaries."},
    {"name": "Emergency", "description": "Read-only plant-wide emergency status and dispatched action snapshots."},
    {"name": "Emergency Response", "description": "Maps compound risk conditions to predefined emergency actions and dispatches them."},
    {"name": "Compliance", "description": "Evaluates detected incidents against Factory Act, OISD, and DGMS compliance rules."},
    {"name": "Recommendations", "description": "Combines Compound Risk, Emergency Response, and Compliance output into ordered operator recommendations."},
    {"name": "Incident Reports", "description": "Generates structured, six-section JSON incident reports from detected risk, emergency response, and compliance data."},
    {"name": "Knowledge Graph", "description": "Reusable Neo4j knowledge-graph lookups: workers by zone, permits by worker, incidents by equipment, sensors by zone, and risks by incident."},
    {"name": "RAG", "description": "Retrieval over ingested OISD/Factory Act/DGMS/incident-report document chunks: document search, semantic search, and question-context retrieval. Retrieval only — no LLM call."},
    {"name": "AI Safety Copilot", "description": "LangGraph AI Supervisor-backed query, explain, recommend, and chat endpoints, routing to specialized Risk/Compliance/Knowledge/Graph Knowledge/Emergency agents with LLM-grounded explainability."},
    {"name": "AI Monitoring", "description": "Read-only observability over the AI layer: agent/routing configuration, live Neo4j/Ollama dependency health, aggregated operation performance metrics, and Supervisor workflow shape."},
    {"name": "Timeline", "description": "Chronological record of every platform event — source, severity, timestamp, and linked AI decision — published on the Unified Event Bus."},
    {"name": "Computer Vision", "description": "Pretrained-YOLO PPE compliance detection (helmet, safety vest, forklift proximity, smoke): ingests per-frame detections, evaluates the PPE Compliance Engine, publishes safety events to the Unified Event Bus, and exposes camera monitoring for compound-risk correlation."},
    {"name": "Demo Scenario Playback", "description": "Starts/stops a timed JSON demo scenario that replays into the live database, driving the production risk/emergency/compliance/alert rule chain once per second so the dashboard updates end to end without manual refresh."},
]


@asynccontextmanager
async def _lifespan(_application: FastAPI) -> AsyncIterator[None]:
    """Release process-level resources on shutdown.

    On startup, ensures Neo4j uniqueness constraints exist (see
    :func:`~src.graph_database.driver.ensure_constraints`) so every
    ``MERGE``-based write in :mod:`src.repositories.graph_base` is
    duplicate-safe under concurrent writers. Non-fatal if Neo4j is
    unreachable at startup — constraints are re-checked on every restart.

    On shutdown, the Neo4j driver (see :mod:`src.graph_database.driver`)
    opens its connection pool at import time and must be closed explicitly
    when the process exits, mirroring how the PostgreSQL engine's pool is
    torn down implicitly by process exit.

    Also registers the Timeline Service as a catch-all subscriber on the
    process-wide event dispatcher (see
    :func:`~src.services.timeline.subscriber.register_timeline_subscriber`)
    so every event published anywhere on the bus for the lifetime of this
    process is recorded, without any producer needing to know the
    timeline exists.

    If ``settings.DEMO_AUTOSTART_SCENARIO`` names a scenario, starts it
    looping immediately so the dashboard, CCTV video, and AI Supervisor
    are all already animating on first page load — no manual "Play
    Scenario" click required. Non-fatal if the named scenario file can't
    be found (e.g. a bad env var value); the app still starts, just
    without the demo running.
    """
    ensure_constraints()
    register_timeline_subscriber(get_default_dispatcher())
    if settings.DEMO_AUTOSTART_SCENARIO:
        try:
            await get_scenario_playback_runner().start(settings.DEMO_AUTOSTART_SCENARIO, loop=True)
        except FileNotFoundError:
            logger.warning(
                "DEMO_AUTOSTART_SCENARIO=%r does not match any scenario file; demo not autostarted.",
                settings.DEMO_AUTOSTART_SCENARIO,
            )
    yield
    await get_scenario_playback_runner().stop()
    close_driver()


def create_application() -> FastAPI:
    """Construct and configure the FastAPI application instance.

    Responsibilities:
        - Set application metadata (title, version, docs URLs).
        - Register CORS middleware with configured origins.
        - Register request-logging middleware.
        - Register centralized exception handlers.
        - Mount all API routers.
        - Define the root ``GET /`` endpoint.

    Returns:
        A fully configured :class:`~fastapi.FastAPI` application ready to serve.
    """
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.PROJECT_VERSION,
        description=(
            "SafeFusion AI — Enterprise-grade AI-powered industrial safety "
            "monitoring platform.\n\n"
            "Provides real-time hazard detection, PPE compliance monitoring, "
            "predictive analytics, and safety incident management.\n\n"
            "This API follows a layered Route -> Service -> Repository architecture "
            "and exposes operational data for workers, sensors, permits, maintenance, "
            "incidents, alerts, dashboard aggregation, and risk assessments."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        debug=settings.DEBUG,
        responses=API_ERROR_RESPONSES,
        openapi_tags=OPENAPI_TAGS_METADATA,
        contact={"name": "SafeFusion AI Backend Team"},
        license_info={"name": "MIT"},
        lifespan=_lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Request logging ───────────────────────────────────────────────────────
    application.add_middleware(RequestLoggingMiddleware)

    # ── Global exception handler ──────────────────────────────────────────────
    register_exception_handlers(application)

    # ── Routers ───────────────────────────────────────────────────────────────
    # Public — no authentication required.
    application.include_router(root_router.router)
    application.include_router(health_router.router)
    application.include_router(auth_router.router, prefix=settings.API_PREFIX)
    # Range-aware CCTV media serving (see src/routes/media.py's docstring for
    # why this is a hand-rolled route rather than StaticFiles).
    media_router.CCTV_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    application.include_router(media_router.router)

    # Protected — every route below requires a valid JWT access token.
    # `get_current_user` runs once per request and is shared with every
    # router via FastAPI's dependency cache, so this adds one auth check
    # per request, not one per router.
    protected_dependencies = [Depends(get_current_user)]

    application.include_router(status_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(dashboard_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(analytics_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(workers_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(sensors_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(sensor_simulator_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(permits_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(maintenance_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(incidents_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(alerts_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(risk_scores_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(monitoring_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(emergency_response_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(emergency_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(compliance_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(recommendations_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(incident_reports_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(incident_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(graph_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(rag_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(ai_copilot_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(ai_monitoring_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(timeline_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(computer_vision_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)
    application.include_router(demo_router.router, prefix=settings.API_PREFIX, dependencies=protected_dependencies)

    return application


# ── Application singleton ─────────────────────────────────────────────────────

app: FastAPI = create_application()


# ── Dev entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info(
        "Starting %s v%s  [debug=%s]",
        settings.PROJECT_NAME,
        settings.PROJECT_VERSION,
        settings.DEBUG,
    )
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )
