"""
Database package for SafeFusion AI backend.

Re-exports the SQLAlchemy engine, session factory, declarative base,
and the DB session FastAPI dependency::

    from src.database import Base, SessionLocal, engine, get_db
"""

from src.database.session import Base, SessionLocal, engine, get_db

__all__: list[str] = ["Base", "SessionLocal", "engine", "get_db"]
