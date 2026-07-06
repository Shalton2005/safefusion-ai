"""
Alembic environment configuration for SafeFusion AI.

This module is invoked by Alembic during ``alembic upgrade``,
``alembic downgrade``, and ``alembic revision --autogenerate`` commands.

It injects the database URL from :data:`src.config.settings.settings`
and registers :attr:`src.database.base.Base.metadata` as the
autogenerate target so that Alembic can detect ORM model changes.

Usage::

    # Generate a new migration after adding/changing ORM models:
    alembic revision --autogenerate -m "describe the change"

    # Apply all pending migrations:
    alembic upgrade head

    # Roll back the last migration:
    alembic downgrade -1
"""

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Resolve project root onto sys.path ────────────────────────────────────────
# Ensures that ``from src.*`` imports work when Alembic is run from the
# backend/ directory (where alembic.ini lives).
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config.settings import settings  # noqa: E402
from src.database.base import Base  # noqa: E402
# Import all model modules to register their tables with Base.metadata
# so that Alembic autogenerate can detect schema changes.
import src.models  # noqa: E402, F401

# ── Alembic Config object ─────────────────────────────────────────────────────
config = context.config

# Inject the database URL from application settings.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Attach Python logging configuration from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata object to compare against for autogenerate support.
target_metadata = Base.metadata


# ── Migration runners ─────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection required).

    Emits SQL to stdout or a file rather than executing it, which is useful
    for reviewing or applying migrations manually.
    """
    url: str = config.get_main_option("sqlalchemy.url")  # type: ignore[assignment]
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode with a live database connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


# ── Entry point ───────────────────────────────────────────────────────────────

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
