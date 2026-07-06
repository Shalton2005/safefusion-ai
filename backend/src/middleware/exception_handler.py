"""
Global exception handler for SafeFusion AI.

Registers with FastAPI to catch any :class:`Exception` that propagates
out of a route handler without being caught by narrower exception handlers.
Returns a structured JSON error envelope with HTTP 500 so that clients
always receive a machine-readable response rather than a raw traceback.
"""

from fastapi import Request
from fastapi.responses import JSONResponse

from src.utils.logger import logger


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle any unhandled exception raised during request processing.

    Logs the full traceback at ERROR level and returns a generic 500 response.
    Sensitive internal details are intentionally omitted from the response body.

    Args:
        request: The HTTP request that triggered the exception.
        exc: The unhandled exception instance.

    Returns:
        A :class:`~fastapi.responses.JSONResponse` with HTTP 500 status and
        a structured error envelope.
    """
    logger.error(
        "Unhandled exception on %s %s — %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
        exc,
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An internal server error occurred.",
            "data": None,
        },
    )
