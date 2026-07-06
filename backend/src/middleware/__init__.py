"""
Middleware package for SafeFusion AI backend.

Re-exports the two core middleware components so that ``server.py``
can register them with a single import::

    from src.middleware import RequestLoggingMiddleware, global_exception_handler
"""

from src.middleware.exception_handler import global_exception_handler
from src.middleware.logging_middleware import RequestLoggingMiddleware

__all__: list[str] = [
    "RequestLoggingMiddleware",
    "global_exception_handler",
]
