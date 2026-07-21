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
        # `BaseHTTPMiddleware.dispatch` (this class's base) fully buffers the
        # downstream response into memory to hand it back here, which silently
        # discards Starlette `StaticFiles`/`FileResponse`'s native HTTP Range
        # support — a request for `Range: bytes=X-Y` comes back as a full 200
        # instead of a partial 206. Large media (e.g. the demo CCTV clip under
        # `/media/`) then can't be seeked/buffered properly by the browser,
        # which manifests as stalling partway through playback. Route media
        # requests around this middleware entirely rather than through it.
        if request.url.path.startswith("/media/"):
            return await call_next(request)

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

            duration_ms: float = (time.perf_counter() - start) * 1_000
            response.headers["X-Request-ID"] = request_id

            logger.info(
                "Request completed method=%s path=%s status_code=%s duration_ms=%.2f",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )

            return response
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
            clear_request_id(token)
