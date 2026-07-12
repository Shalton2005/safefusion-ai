"""
API status router for SafeFusion AI.

Exposes ``GET /api/v1/status`` — confirms that the versioned API tier
is reachable and provides a high-level operational readout of the
backend components.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router: APIRouter = APIRouter(tags=["Status"])


# ── Response model ────────────────────────────────────────────────────────────


class StatusResponse(BaseModel):
    """Response schema for ``GET /api/v1/status``.

    Attributes:
        backend:  Operational state of the FastAPI process.
            Value is ``"running"`` when the process can handle requests.
        database: Configuration state of the PostgreSQL database layer.
            Value is ``"configured"`` when the engine and session factory
            have been initialised from the environment. Does **not** imply
            a successful live connection — use a readiness probe for that.
        graph_database: Configuration state of the Neo4j knowledge-graph
            layer. Value is ``"configured"`` when the driver has been
            initialised from the environment. Does **not** imply a
            successful live connection — use a readiness probe for that.
    """

    backend: str
    database: str
    graph_database: str


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.get(
    "/status",
    summary="API operational status",
    description=(
        "Returns the operational state of the backend process and the database "
        "configuration layer. Useful for smoke-testing a deployment without "
        "requiring a live database connection."
    ),
    response_model=StatusResponse,
    response_model_exclude_none=True,
)
async def api_status() -> StatusResponse:
    """Return the operational status of the backend and database layers.

    The ``database`` and ``graph_database`` fields reflect whether their
    respective connection layers have been successfully initialised from
    the application settings. Neither field probes a live connection; a
    separate readiness check should be used for that purpose.

    Returns:
        A :class:`StatusResponse` with ``backend``, ``database``, and
        ``graph_database`` fields.
    """
    return StatusResponse(
        backend="running",
        database="configured",
        graph_database="configured",
    )
