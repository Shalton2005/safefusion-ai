"""
Declarative base for SafeFusion AI ORM models.

Isolating :class:`Base` in its own module eliminates the circular-import
risk that would arise if models imported from the same module that creates
the engine or session factory (both of which import from settings).

Every ORM model class must inherit from :class:`Base` so that:

- :attr:`Base.metadata` collects every mapped table definition.
- Alembic's ``--autogenerate`` can detect schema changes by inspecting
  the metadata without needing a live database connection.

Usage::

    from src.database.base import Base

    class MyModel(Base):
        __tablename__ = "my_table"
        ...
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base class for all SQLAlchemy ORM models.

    Inherits directly from :class:`~sqlalchemy.orm.DeclarativeBase` (the
    SQLAlchemy 2.0 style) rather than the legacy ``declarative_base()``
    factory call, which gives full type-checker support for mapped columns.

    This class carries no columns, mixins, or default behaviours so that
    individual model authors retain complete control over their schemas.
    Add cross-cutting concerns (audit timestamps, soft-delete flags, etc.)
    as separate mixin classes that models can opt into independently.
    """
