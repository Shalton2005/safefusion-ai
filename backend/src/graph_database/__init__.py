"""
Graph database package for SafeFusion AI backend.

Provides a Neo4j connection layer that is entirely independent of the
PostgreSQL layer in :mod:`src.database`. The layer is split across two
focused modules:

``driver``  — :data:`~src.graph_database.driver.driver` singleton, plus
              :func:`~src.graph_database.driver.verify_connectivity` and
              :func:`~src.graph_database.driver.close_driver` lifecycle helpers.
``session`` — :func:`~src.graph_database.session.get_graph_session` FastAPI
              dependency and :func:`~src.graph_database.session.graph_session`
              context manager.

All public symbols are re-exported here so callers can use a single import path::

    from src.graph_database import driver, get_graph_session, graph_session

No Cypher queries or knowledge-graph logic live in this package yet — it
only establishes the reusable connection infrastructure. Query logic
belongs in future graph repository modules under ``src.repositories``.
"""

from src.graph_database.driver import close_driver, driver, verify_connectivity
from src.graph_database.session import get_graph_session, graph_session

__all__: list[str] = [
    "driver",
    "verify_connectivity",
    "close_driver",
    "get_graph_session",
    "graph_session",
]
