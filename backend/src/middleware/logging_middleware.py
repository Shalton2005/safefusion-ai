"""
Request logging middleware for SafeFusion AI.

Intercepts every HTTP request, forwards it to the downstream handler,
and emits a structured log line containing the HTTP method, path,
response status code, and wall-clock processing time.
"""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.utils.logger import clear_request_id, get_logger, set_request_id


logger = get_logger(__name__)


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
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = set_request_id(request_id)
        request.state.request_id = request_id

        logger.info(
            "Request started method=%s path=%s client=%s",
            request.method,
            request.url.path,
            request.client.host if request.client else "unknown",
        )

        try:
            response: Response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1_000
            logger.exception(
                "Request failed method=%s path=%s duration_ms=%.2f",
                request.method,
                request.url.path,
                duration_ms,
            )
            raise
        finally:
            pass

        duration_ms: float = (time.perf_counter() - start) * 1_000
        response.headers["X-Request-ID"] = request_id

        logger.info(
            "Request completed method=%s path=%s status_code=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

        clear_request_id(token)

        return response
