"""
Generic base repository for SafeFusion AI.

Provides type-safe CRUD operations using SQLAlchemy 2.x ``select()``
style queries.  Domain-specific repositories extend this class and add
query methods relevant to their aggregate root.
"""

from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import func, select, delete
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    """Generic synchronous CRUD repository backed by a SQLAlchemy session.

    Args:
        model: The SQLAlchemy ORM model class to operate on.
        db: An active :class:`~sqlalchemy.orm.Session` injected per request.
    """

    def __init__(self, model: type[ModelT], db: Session) -> None:
        self._model = model
        self._db = db

    # ── Read ─────────────────────────────────────────────────────────────────

    def get_all(self, skip: int = 0, limit: int = 100) -> list[ModelT]:
        """Return a paginated list of records ordered by default table ordering."""
        return list(
            self._db.execute(
                select(self._model).offset(skip).limit(limit)
            ).scalars().all()
        )

    def get_by_id(self, record_id: UUID) -> ModelT | None:
        """Return the record matching ``record_id``, or ``None`` if not found."""
        return self._db.get(self._model, record_id)

    def count(self) -> int:
        """Return the total number of records in the table."""
        return self._db.execute(
            select(func.count()).select_from(self._model)
        ).scalar_one()

    # ── Write ─────────────────────────────────────────────────────────────────

    def create(self, data: dict) -> ModelT:
        """Create and persist a new record from a field-value mapping.

        Args:
            data: Dictionary of column names to values.

        Returns:
            The newly created and refreshed ORM instance.
        """
        obj: ModelT = self._model(**data)
        self._db.add(obj)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def update(self, record_id: UUID, data: dict) -> ModelT | None:
        """Apply a partial update to an existing record.

        Args:
            record_id: Primary key of the record to update.
            data: Dictionary of field names to new values (only set fields).

        Returns:
            The updated ORM instance, or ``None`` if the record does not exist.
        """
        obj = self._db.get(self._model, record_id)
        if obj is None:
            return None
        for field, value in data.items():
            setattr(obj, field, value)
        self._db.commit()
        self._db.refresh(obj)
        return obj

    def delete(self, record_id: UUID) -> bool:
        """Delete a record by primary key.

        Returns:
            ``True`` if the record was deleted, ``False`` if not found.
        """
        obj = self._db.get(self._model, record_id)
        if obj is None:
            return False
        self._db.delete(obj)
        self._db.commit()
        return True

    def delete_all(self) -> int:
        """Delete all records in the table.

        Returns:
            The number of deleted rows.
        """
        deleted = self._db.execute(delete(self._model)).rowcount
        self._db.commit()
        return deleted
