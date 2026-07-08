"""
Standardized JSON response helpers for SafeFusion AI.

Every API response follows a consistent envelope schema::

    {
        "success": bool,
        "message": str,
        "data":    Any | null
    }

Using a uniform envelope makes it straightforward for clients to parse
responses without inspecting HTTP status codes alone.
"""

from typing import Any, Optional

from fastapi.responses import JSONResponse


def success_response(
    data: Optional[Any] = None,
    message: str = "Success.",
    status_code: int = 200,
) -> JSONResponse:
    """Build a standardized success JSON response.

    Args:
        data: The response payload to include under the ``"data"`` key.
        message: A human-readable success message.
        status_code: The HTTP status code to set on the response (default ``200``).

    Returns:
        A :class:`~fastapi.responses.JSONResponse` with the success envelope.
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data,
        },
    )


def error_response(
    message: str = "An error occurred.",
    status_code: int = 400,
    data: Optional[Any] = None,
    headers: Optional[dict[str, str]] = None,
) -> JSONResponse:
    """Build a standardized error JSON response.

    Args:
        message: A human-readable error description.
        status_code: The HTTP status code to set on the response (default ``400``).
        data: Optional additional context (e.g. validation error details).
        headers: Optional HTTP headers to include in the response.

    Returns:
        A :class:`~fastapi.responses.JSONResponse` with the error envelope.
    """
    return JSONResponse(
        status_code=status_code,
        headers=headers,
        content={
            "success": False,
            "message": message,
            "data": data,
        },
    )
