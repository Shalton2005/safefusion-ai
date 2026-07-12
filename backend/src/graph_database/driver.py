"""
Neo4j driver factory for SafeFusion AI.

This module owns the single :class:`~neo4j.Driver` instance for the whole
application, independent of the PostgreSQL engine defined in
:mod:`src.database.database`. Centralising driver construction here means
the connection URI, credentials, and diagnostic options are configured in
exactly one place.

All other graph-database-layer modules obtain the driver by importing
:data:`driver` from this module — they never call
:func:`neo4j.GraphDatabase.driver` themselves.

The driver itself manages an internal connection pool, so — like the
SQLAlchemy ``Engine`` — a single instance should be created at process
startup and shared across the application's lifetime, then closed once
on shutdown via :func:`close_driver`.
"""

from neo4j import Driver, GraphDatabase

from src.config.settings import settings
from src.utils.logger import get_logger


logger = get_logger(__name__)


# ── Driver factory ────────────────────────────────────────────────────────────

def _build_driver() -> Driver:
    """Construct and return a fully configured :class:`~neo4j.Driver`.

    Called once at module import time to create the application-level
    singleton. Breaking construction into a named function makes the
    intent explicit and simplifies testing (tests can call this function
    with patched settings).

    Returns:
        A :class:`~neo4j.Driver` connected to the Neo4j instance defined by
        :attr:`~src.config.settings.Settings.NEO4J_URI`.
    """
    return GraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
    )


# ── Module-level singleton ────────────────────────────────────────────────────

driver: Driver = _build_driver()


# ── Lifecycle helpers ─────────────────────────────────────────────────────────

def verify_connectivity() -> bool:
    """Verify that the driver can reach the configured Neo4j instance.

    Performs a lightweight handshake against the server. Does not run any
    Cypher query. Intended for readiness probes and startup diagnostics —
    never called implicitly at import time, since the database may not yet
    be available when the module is first imported.

    Returns:
        ``True`` if connectivity succeeded, ``False`` otherwise.
    """
    try:
        driver.verify_connectivity()
        return True
    except Exception:
        logger.exception("Neo4j connectivity check failed")
        return False


def close_driver() -> None:
    """Close the singleton driver and release all pooled connections.

    Intended to be called once during application shutdown (e.g. a FastAPI
    ``shutdown`` event/lifespan handler). Safe to call even if the driver
    was never used to run a query.
    """
    driver.close()
    logger.info("Neo4j driver closed")
