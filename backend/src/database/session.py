"""
SQLAlchemy database session configuration for SafeFusion AI.

Provides:
    - :data:`engine`       — The SQLAlchemy :class:`~sqlalchemy.engine.Engine` instance.
    - :data:`SessionLocal` — Session factory bound to the engine.
    - :class:`Base`        — Declarative base class for all ORM models.
    - :func:`get_db`       — FastAPI dependency that yields a managed DB session.

No tables are created here; schema management is handled exclusively
through Alembic migrations.
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.config.settings import settings


# ── Engine ────────────────────────────────────────────────────────────────────

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # Re-verify connections before use (handles stale connections).
    pool_size=10,         # Number of persistent connections in the pool.
    max_overflow=20,      # Extra connections allowed beyond pool_size under load.
    echo=settings.DEBUG,  # Log all emitted SQL statements when DEBUG is enabled.
)

# ── Session factory ───────────────────────────────────────────────────────────

SessionLocal: sessionmaker[Session] = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ── Declarative base ──────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models.

    All model classes must inherit from this base so that Alembic can
    detect schema changes via :attr:`Base.metadata`.
    """


# ── DB session dependency ─────────────────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a scoped SQLAlchemy session.

    Opens a session before the request, yields it to the route handler,
    and guarantees closure even if an exception is raised.

    Yields:
        A :class:`~sqlalchemy.orm.Session` bound to the configured engine.

    Example::

        @router.get("/example")
        def example(db: Session = Depends(get_db)) -> ...:
            ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
