"""Centralized exception handling for the SafeFusion AI API."""

from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.utils.logger import get_logger
from src.utils.response import error_response


logger = get_logger(__name__)


DEFAULT_ERROR_MESSAGES: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "Bad request.",
    status.HTTP_401_UNAUTHORIZED: "Authentication required.",
    status.HTTP_403_FORBIDDEN: "You do not have permission to perform this action.",
    status.HTTP_404_NOT_FOUND: "The requested resource was not found.",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "Request validation failed.",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "An internal server error occurred.",
}


API_ERROR_RESPONSES: dict[int, dict[str, Any]] = {
    status_code: {
        "description": message,
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "message": message,
                    "data": None,
                }
            }
        },
    }
    for status_code, message in DEFAULT_ERROR_MESSAGES.items()
}


def get_error_message(status_code: int, detail: Any = None) -> str:
    """Resolve a client-safe error message for an HTTP status code."""
    default_message = DEFAULT_ERROR_MESSAGES.get(status_code)
    try:
        status_phrase = HTTPStatus(status_code).phrase
    except ValueError:
        status_phrase = None

    if (
        isinstance(detail, str)
        and detail.strip()
        and detail.strip() != status_phrase
    ):
        return detail

    if default_message:
        return default_message

    return status_phrase or "Request failed."


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """Handle FastAPI and Starlette HTTP exceptions with one response shape."""
    status_code = exc.status_code
    message = get_error_message(status_code, exc.detail)

    if status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
        logger.error(
            "HTTP exception on %s %s - %s: %s",
            request.method,
            request.url.path,
            status_code,
            exc.detail,
            exc_info=True,
        )
    elif status_code in {
        status.HTTP_400_BAD_REQUEST,
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
        status.HTTP_404_NOT_FOUND,
    }:
        logger.info(
            "Handled HTTP exception on %s %s - %s: %s",
            request.method,
            request.url.path,
            status_code,
            message,
        )

    return error_response(
        message=message,
        status_code=status_code,
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Handle request validation errors raised by FastAPI/Pydantic."""
    logger.info(
        "Validation error on %s %s - %s",
        request.method,
        request.url.path,
        exc.errors(),
    )

    return error_response(
        message=DEFAULT_ERROR_MESSAGES[status.HTTP_422_UNPROCESSABLE_ENTITY],
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        data={"errors": exc.errors()},
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions without leaking internal details."""
    logger.error(
        "Unhandled exception on %s %s - %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
        exc,
        exc_info=True,
    )

    return error_response(
        message=DEFAULT_ERROR_MESSAGES[status.HTTP_500_INTERNAL_SERVER_ERROR],
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def register_exception_handlers(application: FastAPI) -> None:
    """Register all API exception handlers in one place."""
    application.add_exception_handler(StarletteHTTPException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
    application.add_exception_handler(Exception, global_exception_handler)
