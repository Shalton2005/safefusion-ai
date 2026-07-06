"""
Root endpoint router for SafeFusion AI.

Exposes ``GET /`` — the API entry point that returns project identity
metadata and is the first thing a client or developer sees when they
point a browser or HTTP client at the service.

Keeping this in its own module instead of inlining it in ``server.py``
ensures the endpoint participates in the same router lifecycle as every
other route (tags, response model, OpenAPI schema generation).
"""

from fastapi import APIRouter
from pydantic import BaseModel

from src.config.settings import settings

router: APIRouter = APIRouter(tags=["Root"])


# ── Response model ────────────────────────────────────────────────────────────


class RootResponse(BaseModel):
    """Response schema for ``GET /``.

    Attributes:
        project: The canonical project name loaded from application settings.
        version: The current API / application version string.
    """

    project: str
    version: str


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.get(
    "/",
    summary="API root",
    description=(
        "Returns the project name and running version. "
        "Use this endpoint to verify connectivity and discover the API version."
    ),
    response_model=RootResponse,
    response_model_exclude_none=True,
)
async def root() -> RootResponse:
    """Return the project name and version.

    Reads ``PROJECT_NAME`` and ``PROJECT_VERSION`` from the application
    settings so the response always reflects the values set via environment
    variables or the ``.env`` file.

    Returns:
        A :class:`RootResponse` containing the project name and version.
    """
    return RootResponse(
        project=settings.PROJECT_NAME,
        version=settings.PROJECT_VERSION,
    )
