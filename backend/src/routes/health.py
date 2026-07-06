"""
Health check router for SafeFusion AI.

Exposes ``GET /health`` — a lightweight liveness probe used by load
balancers, container orchestrators (e.g. Kubernetes), and monitoring
systems to confirm the service process is alive and able to handle
requests.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from src.utils.response import success_response

router: APIRouter = APIRouter(tags=["Health"])


@router.get(
    "/health",
    summary="Liveness probe",
    description="Returns HTTP 200 when the service is alive and accepting requests.",
    response_class=JSONResponse,
)
async def health_check() -> JSONResponse:
    """Return the current liveness status of the service.

    Returns:
        A JSON envelope with ``status: healthy``.
    """
    return success_response(
        data={"status": "healthy"},
        message="Service is running.",
    )
