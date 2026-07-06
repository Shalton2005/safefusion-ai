"""
Database package for SafeFusion AI backend.

The layer is split across three focused modules:

``base``     — :class:`~src.database.base.Base` declarative base (no engine dependency).
``database`` — :data:`~src.database.database.engine` singleton and pool configuration.
``session``  — :data:`~src.database.session.SessionLocal` factory, :func:`~src.database.session.get_db`
               FastAPI dependency, and :func:`~src.database.session.db_session` context manager.

All public symbols are re-exported here so callers can use a single import path::

    from src.database import Base, engine, SessionLocal, get_db, db_session
"""

from src.database.base import Base
from src.database.database import engine
from src.database.session import SessionLocal, db_session, get_db

__all__: list[str] = [
    "Base",
    "engine",
    "SessionLocal",
    "get_db",
    "db_session",
]
