"""
Database session management for SafeFusion AI.

Provides two ways to obtain a managed :class:`~sqlalchemy.orm.Session`:

``get_db()``
    FastAPI ``Depends``-compatible generator that opens a session at the
    start of each HTTP request and closes it unconditionally when the
    request completes.  The caller is responsible for committing.

``db_session()``
    A :func:`~contextlib.contextmanager`-based alternative for code that
    runs outside the FastAPI dependency-injection system — background
    workers, Alembic data migrations, CLI scripts, and test fixtures.
    Automatically commits on a clean exit and rolls back on any exception.

Both helpers draw connections from the same :data:`SessionLocal` factory,
which is bound to the singleton engine defined in :mod:`src.database.database`.

Session configuration notes:

``autocommit=False``
    Transactions must be committed explicitly.  This is the only safe
    default for a web application.

``autoflush=False``
    SQLAlchemy will not issue implicit ``FLUSH`` statements before every
    query.  This avoids surprising round-trips and lets the application
    control exactly when SQL is sent to the database.

``expire_on_commit=False``
    ORM-mapped attributes remain accessible after :meth:`~sqlalchemy.orm.Session.commit`
    without a database round-trip.  Essential for returning model
    instances from route handlers after committing, because FastAPI
    serialises the response *after* the route function returns —
    at which point the session is already closed.
"""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy.orm import Session, sessionmaker

from src.database.database import engine


# ── Session factory ───────────────────────────────────────────────────────────

SessionLocal: sessionmaker[Session] = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """FastAPI ``Depends``-compatible database session dependency.

    Yields a session for the lifetime of a single HTTP request.  The
    session is closed in a ``finally`` block so the connection is always
    returned to the pool, even if the route handler raises an exception.

    The caller (route handler or repository) is responsible for calling
    :meth:`~sqlalchemy.orm.Session.commit` — this function never commits.

    Yields:
        A :class:`~sqlalchemy.orm.Session` bound to the configured engine.

    Example::

        from typing import Annotated
        from fastapi import Depends
        from sqlalchemy.orm import Session
        from src.database import get_db

        DbDep = Annotated[Session, Depends(get_db)]

        @router.get("/items")
        def list_items(db: DbDep) -> list:
            ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Reusable context manager ──────────────────────────────────────────────────

@contextmanager
def db_session() -> Generator[Session, None, None]:
    """Context-managed database session for use outside of FastAPI.

    Unlike :func:`get_db`, this helper manages the transaction boundary:
    it commits on a clean exit and rolls back automatically if an
    exception propagates out of the ``with`` block.

    Intended for:

    - Background tasks and Celery/ARQ workers.
    - Alembic data migrations that run Python-level logic.
    - CLI management scripts.
    - Pytest fixtures that bypass the FastAPI DI system.

    Example::

        from src.database.session import db_session

        with db_session() as db:
            db.add(Widget(name="sprocket"))
            # Commit is automatic on clean exit.

    Raises:
        Any exception raised inside the block, after rolling back.
    """
    db: Session = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
