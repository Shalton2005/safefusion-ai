"""
Centralized logging configuration for SafeFusion AI.

Provides a pre-configured application logger and a factory function for
creating module-level child loggers that inherit the same handler and
format settings.

Usage::

    from src.utils.logger import logger, get_logger

    logger.info("Application started.")
    module_log = get_logger(__name__)
"""

import logging
import sys
from typing import Optional


# ── Constants ─────────────────────────────────────────────────────────────────

_ROOT_LOGGER_NAME: str = "safefusion"
_LOG_FORMAT: str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"


# ── Factory ───────────────────────────────────────────────────────────────────

def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Create or retrieve a named logger with a stdout stream handler.

    Handlers are only attached once, making this function safe to call
    multiple times with the same name.

    Args:
        name: The logger name. Defaults to the root ``"safefusion"`` logger.
              Use ``__name__`` from the calling module to create a child logger.

    Returns:
        A configured :class:`logging.Logger` instance.
    """
    log_name: str = name or _ROOT_LOGGER_NAME
    log: logging.Logger = logging.getLogger(log_name)

    if not log.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))
        log.addHandler(handler)
        log.setLevel(logging.INFO)
        log.propagate = False

    return log


# ── Singleton ─────────────────────────────────────────────────────────────────

logger: logging.Logger = get_logger(_ROOT_LOGGER_NAME)
