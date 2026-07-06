"""
API status router for SafeFusion AI.

Exposes ``GET /api/v1/status`` — confirms that the versioned API tier
is reachable and returns project metadata useful for client-side
version negotiation and monitoring dashboards.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from src.config.settings import settings
from src.utils.response import success_response

router: APIRouter = APIRouter(tags=["Status"])


@router.get(
    "/status",
    summary="API operational status",
    description=(
        "Returns the project name, current API version, and operational status "
        "of the versioned API tier."
    ),
    response_class=JSONResponse,
)
async def api_status() -> JSONResponse:
    """Return project metadata and the current API operational status.

    Returns:
        A JSON envelope containing ``name``, ``version``, and ``status``.
    """
    return success_response(
        data={
            "name": settings.PROJECT_NAME,
            "version": settings.PROJECT_VERSION,
            "status": "operational",
        },
        message="API is operational.",
    )
