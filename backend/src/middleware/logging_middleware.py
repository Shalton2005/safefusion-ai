"""
Request logging middleware for SafeFusion AI.

Intercepts every HTTP request, forwards it to the downstream handler,
and emits a structured log line containing the HTTP method, path,
response status code, and wall-clock processing time.
"""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.utils.logger import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """ASGI middleware that logs metadata for every inbound HTTP request."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Forward the request and log its outcome.

        Args:
            request: The incoming HTTP request object.
            call_next: Callable that invokes the next middleware or route handler.

        Returns:
            The :class:`~starlette.responses.Response` produced by the handler.
        """
        start: float = time.perf_counter()

        response: Response = await call_next(request)

        duration_ms: float = (time.perf_counter() - start) * 1_000

        logger.info(
            "%s %s — %s — %.2fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

        return response
