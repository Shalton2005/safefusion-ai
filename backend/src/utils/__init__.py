"""
Utilities package for SafeFusion AI backend.

Re-exports the most commonly used helpers so callers can import from
the package root::

    from src.utils import logger, get_logger, success_response, error_response
"""

from src.utils.logger import get_logger, logger
from src.utils.response import error_response, success_response

__all__: list[str] = [
    "logger",
    "get_logger",
    "success_response",
    "error_response",
]
