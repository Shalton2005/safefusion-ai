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

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import settings
from src.middleware.exception_handler import API_ERROR_RESPONSES, register_exception_handlers
from src.middleware.logging_middleware import RequestLoggingMiddleware
from src.routes import alerts as alerts_router
from src.routes import dashboard as dashboard_router
from src.routes import health as health_router
from src.routes import incidents as incidents_router
from src.routes import maintenance as maintenance_router
from src.routes import permits as permits_router
from src.routes import risk_scores as risk_scores_router
from src.routes import root as root_router
from src.routes import sensors as sensors_router
from src.routes import status as status_router
from src.routes import workers as workers_router
from src.utils.logger import configure_logging, get_logger


configure_logging(debug=settings.DEBUG)
logger = get_logger(__name__)


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
            "predictive analytics, and safety incident management."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        debug=settings.DEBUG,
        responses=API_ERROR_RESPONSES,
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
    application.include_router(root_router.router)
    application.include_router(health_router.router)
    application.include_router(status_router.router, prefix=settings.API_PREFIX)
    application.include_router(dashboard_router.router, prefix=settings.API_PREFIX)
    application.include_router(workers_router.router, prefix=settings.API_PREFIX)
    application.include_router(sensors_router.router, prefix=settings.API_PREFIX)
    application.include_router(permits_router.router, prefix=settings.API_PREFIX)
    application.include_router(maintenance_router.router, prefix=settings.API_PREFIX)
    application.include_router(incidents_router.router, prefix=settings.API_PREFIX)
    application.include_router(alerts_router.router, prefix=settings.API_PREFIX)
    application.include_router(risk_scores_router.router, prefix=settings.API_PREFIX)

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
