"""
Routes package for SafeFusion AI backend.

Each sub-module exposes an :class:`~fastapi.APIRouter` that is mounted
on the FastAPI application in ``server.py``.

Available routers:
    - :mod:`src.routes.root`         — ``GET /``
    - :mod:`src.routes.health`       — ``GET /health``
    - :mod:`src.routes.status`       — ``GET /api/v1/status``
    - :mod:`src.routes.dashboard`    — ``GET /api/v1/dashboard``
    - :mod:`src.routes.workers`      — ``/api/v1/workers``
    - :mod:`src.routes.sensors`      — ``/api/v1/sensors``
    - :mod:`src.routes.permits`      — ``/api/v1/permits``
    - :mod:`src.routes.maintenance`  — ``/api/v1/maintenance``
    - :mod:`src.routes.incidents`    — ``/api/v1/incidents``
    - :mod:`src.routes.alerts`       — ``/api/v1/alerts``
    - :mod:`src.routes.risk_scores`  — ``/api/v1/risk-scores``
"""
