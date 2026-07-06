"""
Health check router for SafeFusion AI.

Exposes ``GET /health`` — a lightweight liveness probe used by load
balancers, container orchestrators (e.g. Kubernetes), and monitoring
systems to confirm the service process is alive and able to handle
requests.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router: APIRouter = APIRouter(tags=["Health"])


# ── Response model ────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """Response schema for ``GET /health``.

    Attributes:
        status: Human-readable liveness state. Always ``"healthy"`` when the
            service is running and accepting requests.
    """

    status: str


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.get(
    "/health",
    summary="Liveness probe",
    description=(
        "Returns HTTP 200 with ``status: healthy`` when the service process is "
        "alive and able to accept requests. Intended for load-balancer and "
        "container-orchestrator health checks."
    ),
    response_model=HealthResponse,
    response_model_exclude_none=True,
)
async def health_check() -> HealthResponse:
    """Return the liveness status of the service.

    This endpoint performs no I/O — it exists solely to confirm the process
    is running and the ASGI server is accepting connections.

    Returns:
        A :class:`HealthResponse` with ``status`` set to ``"healthy"``.
    """
    return HealthResponse(status="healthy")
