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


# ── Node labels requiring a uniqueness constraint on ``id`` ────────────────────
# Every label this application MERGEs on via GraphBaseRepository.merge_node.
# Neo4j does not auto-index arbitrary properties, so without a uniqueness
# constraint each MERGE performs a full label scan, and — because the
# match-then-create in MERGE is only atomic when backed by a constraint's
# index — concurrent ingestion runs could otherwise create duplicate nodes
# for the same id. Keep this list in sync with the labels used across
# src/services/graph_ingestion.py.
_CONSTRAINED_NODE_LABELS: tuple[str, ...] = (
    "Zone",
    "Worker",
    "Sensor",
    "Permit",
    "Equipment",
    "Maintenance",
    "Incident",
    "Risk",
)


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


def ensure_constraints() -> bool:
    """Create the uniqueness constraint on ``id`` for every graph node label.

    Idempotent — uses ``IF NOT EXISTS``, so safe to call on every process
    startup. Intended to be called once during application startup (and
    before any ingestion run) so every :meth:`~src.repositories.graph_base.GraphBaseRepository.merge_node`
    call is backed by an index: without a constraint, Neo4j has nothing to
    lock on for a ``MERGE``'s match-then-create, so concurrent writers can
    race and create duplicate nodes for the same ``id`` — the constraint is
    what actually guarantees the "no duplicate nodes" behaviour the ingestion
    layer otherwise only achieves under non-concurrent access.

    Never called implicitly at import time (mirrors :func:`verify_connectivity`)
    since Neo4j may not yet be reachable when this module is first imported.

    Returns:
        ``True`` if every constraint was created/confirmed, ``False`` if
        Neo4j was unreachable or a constraint statement failed.
    """
    try:
        with driver.session(database=settings.NEO4J_DATABASE) as session:
            for label in _CONSTRAINED_NODE_LABELS:
                session.run(
                    f"CREATE CONSTRAINT IF NOT EXISTS FOR (n:{label}) REQUIRE n.id IS UNIQUE"
                )
        logger.info("Neo4j uniqueness constraints ensured for labels=%s", _CONSTRAINED_NODE_LABELS)
        return True
    except Exception as exc:
        # Neo4j being unreachable at startup is an expected condition (e.g.
        # local dev without Neo4j running) — log a concise warning, not a
        # full traceback, and never let this block application startup.
        logger.warning("Skipping Neo4j uniqueness constraints: %s", exc)
        return False


def close_driver() -> None:
    """Close the singleton driver and release all pooled connections.

    Intended to be called once during application shutdown (e.g. a FastAPI
    ``shutdown`` event/lifespan handler). Safe to call even if the driver
    was never used to run a query.
    """
    driver.close()
    logger.info("Neo4j driver closed")
