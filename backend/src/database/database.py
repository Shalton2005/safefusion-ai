"""
SQLAlchemy engine factory for SafeFusion AI.

This module owns the single engine instance for the whole application.
Centralising engine construction here means pool settings, the database
URL, and diagnostic options are configured in exactly one place.

All other database-layer modules obtain the engine by importing
:data:`engine` from this module — they never call :func:`create_engine`
themselves.

Production pool configuration overview:

``pool_pre_ping``
    Executes a cheap ``SELECT 1`` before lending a connection to a
    caller.  Prevents ``OperationalError`` caused by stale sockets after
    network interruptions or database restarts.

``pool_size``
    Number of persistent connections kept open in the pool at all
    times.  Tune to roughly match your expected concurrent request count.

``max_overflow``
    Extra connections allowed above ``pool_size`` during traffic spikes.
    These are closed as soon as they are returned to the pool.

``pool_recycle``
    Replace connections older than this many seconds.  Prevents silent
    disconnects caused by network ACL timeouts or the database server's
    own ``wait_timeout`` / ``tcp_keepalive`` settings (default: 30 min).

``pool_timeout``
    Seconds to wait for a connection from the pool before raising
    :class:`~sqlalchemy.exc.TimeoutError`.  Prevents request pile-ups
    when the pool is exhausted.

``echo``
    Forwards every emitted SQL statement to the Python ``logging``
    subsystem.  Controlled by the ``DEBUG`` setting — never ``True``
    in production.
"""

from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.pool import QueuePool

from src.config.settings import settings


# ── Engine factory ────────────────────────────────────────────────────────────

def _build_engine() -> Engine:
    """Construct and return a fully configured :class:`~sqlalchemy.engine.Engine`.

    Called once at module import time to create the application-level
    singleton.  Breaking construction into a named function makes the
    intent explicit and simplifies testing (tests can call this function
    with a patched settings object).

    Returns:
        A :class:`~sqlalchemy.engine.Engine` bound to the PostgreSQL URL
        defined in :attr:`~src.config.settings.Settings.DATABASE_URL`.
    """
    return create_engine(
        settings.DATABASE_URL,
        poolclass=QueuePool,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1_800,   # seconds — 30 minutes
        pool_timeout=30,
        echo=settings.DEBUG,
        echo_pool=False,
    )


# ── Connection event hooks ────────────────────────────────────────────────────

def _register_engine_events(eng: Engine) -> None:
    """Attach SQLAlchemy engine-level event listeners.

    Listeners run inside the engine's connection lifecycle and are useful
    for diagnostics, enforcing per-connection pragmas, or custom logging.
    """

    @event.listens_for(eng, "connect")
    def _on_connect(dbapi_conn, connection_record) -> None:  # noqa: ANN001
        """Log each new DBAPI connection being added to the pool."""
        # Uncomment the line below to trace new physical connections:
        # logger.debug("New DBAPI connection established: %s", dbapi_conn)
        pass

    @event.listens_for(eng, "checkout")
    def _on_checkout(dbapi_conn, connection_record, connection_proxy) -> None:  # noqa: ANN001
        """Invoked when a connection is checked out from the pool.

        pool_pre_ping already validates the connection; this hook exists
        as an extension point for future per-request instrumentation.
        """
        pass


# ── Module-level singleton ────────────────────────────────────────────────────

engine: Engine = _build_engine()
_register_engine_events(engine)
