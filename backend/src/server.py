"""Compatibility ASGI entrypoint.

Allows running the backend with:
    uvicorn src.server:app

while preserving the existing canonical entrypoint in ``server.py``.
"""

from server import app, create_application

__all__: list[str] = ["app", "create_application"]
