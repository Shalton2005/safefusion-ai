"""
Neo4j session management for SafeFusion AI.

Provides two ways to obtain a managed :class:`~neo4j.Session`, mirroring
the PostgreSQL patterns in :mod:`src.database.session`:

``get_graph_session()``
    FastAPI ``Depends``-compatible generator that opens a session at the
    start of each HTTP request and closes it unconditionally when the
    request completes.

``graph_session()``
    A :func:`~contextlib.contextmanager`-based alternative for code that
    runs outside the FastAPI dependency-injection system — background
    workers, CLI scripts, and test fixtures.

Both helpers draw from the same singleton driver defined in
:mod:`src.graph_database.driver`, and are entirely independent of the
PostgreSQL session layer.
"""

from contextlib import contextmanager
from typing import Generator

from neo4j import Session

from src.config.settings import settings
from src.graph_database.driver import driver


# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_graph_session() -> Generator[Session, None, None]:
    """FastAPI ``Depends``-compatible Neo4j session dependency.

    Yields a session for the lifetime of a single HTTP request. The
    session is closed in a ``finally`` block so the underlying connection
    is always returned to the driver's pool, even if the route handler
    raises an exception.

    Yields:
        A :class:`~neo4j.Session` bound to the configured database.

    Example::

        from typing import Annotated
        from fastapi import Depends
        from neo4j import Session
        from src.graph_database import get_graph_session

        GraphSessionDep = Annotated[Session, Depends(get_graph_session)]
    """
    session: Session = driver.session(database=settings.NEO4J_DATABASE)
    try:
        yield session
    finally:
        session.close()


# ── Reusable context manager ──────────────────────────────────────────────────

@contextmanager
def graph_session() -> Generator[Session, None, None]:
    """Context-managed Neo4j session for use outside of FastAPI.

    Intended for background tasks, CLI management scripts, and pytest
    fixtures that bypass the FastAPI dependency-injection system.

    Example::

        from src.graph_database.session import graph_session

        with graph_session() as session:
            ...  # future knowledge-graph queries
    """
    session: Session = driver.session(database=settings.NEO4J_DATABASE)
    try:
        yield session
    finally:
        session.close()
