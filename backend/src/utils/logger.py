"""Centralized, production-ready logging configuration for SafeFusion AI."""

from __future__ import annotations

import contextvars
import logging
import logging.config
import sys
from typing import Optional


_ROOT_LOGGER_NAME = "safefusion"
_LOG_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s | req=%(request_id)s | %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
_request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id",
    default="-",
)
_is_configured = False


class RequestContextFilter(logging.Filter):
    """Inject request correlation data into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id_ctx.get()
        return True


def set_request_id(request_id: str) -> contextvars.Token[str]:
    """Bind a request identifier to the current execution context."""
    return _request_id_ctx.set(request_id)


def clear_request_id(token: contextvars.Token[str]) -> None:
    """Restore the previous request identifier for the current context."""
    _request_id_ctx.reset(token)


def configure_logging(*, log_level: str = "INFO", debug: bool = False) -> None:
    """Configure application, API, and database loggers once for the process."""
    global _is_configured

    if _is_configured:
        return

    normalized_level = log_level.upper()
    sqlalchemy_level = "DEBUG" if debug else "WARNING"

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {
                "request_context": {
                    "()": "src.utils.logger.RequestContextFilter",
                }
            },
            "formatters": {
                "standard": {
                    "format": _LOG_FORMAT,
                    "datefmt": _DATE_FORMAT,
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "stream": sys.stdout,
                    "formatter": "standard",
                    "filters": ["request_context"],
                }
            },
            "loggers": {
                _ROOT_LOGGER_NAME: {
                    "handlers": ["console"],
                    "level": normalized_level,
                    "propagate": False,
                },
                "uvicorn": {
                    "handlers": ["console"],
                    "level": normalized_level,
                    "propagate": False,
                },
                "uvicorn.error": {
                    "handlers": ["console"],
                    "level": normalized_level,
                    "propagate": False,
                },
                "uvicorn.access": {
                    "handlers": ["console"],
                    "level": normalized_level,
                    "propagate": False,
                },
                "sqlalchemy.engine": {
                    "handlers": ["console"],
                    "level": sqlalchemy_level,
                    "propagate": False,
                },
                "sqlalchemy.pool": {
                    "handlers": ["console"],
                    "level": sqlalchemy_level,
                    "propagate": False,
                },
            },
            "root": {
                "handlers": ["console"],
                "level": "WARNING",
            },
        }
    )

    _is_configured = True


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Return a named logger from the centralized logging configuration."""
    configure_logging()
    return logging.getLogger(name or _ROOT_LOGGER_NAME)


logger: logging.Logger = get_logger(_ROOT_LOGGER_NAME)
