"""
Permit repository for SafeFusion AI.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.enums import PermitStatus
from src.models.permit import Permit
from src.repositories.base import BaseRepository


class PermitRepository(BaseRepository[Permit]):
    """Data-access layer for the Permit-to-Work aggregate."""

    def __init__(self, db: Session) -> None:
        super().__init__(Permit, db)

    def get_active(self) -> list[Permit]:
        """Return all permits with status ``active``."""
        return list(
            self._db.execute(
                select(Permit).where(Permit.status == PermitStatus.ACTIVE)
            ).scalars().all()
        )

    def get_by_zone(self, zone: str) -> list[Permit]:
        """Return all permits issued for the given plant zone."""
        return list(
            self._db.execute(
                select(Permit).where(Permit.zone == zone)
            ).scalars().all()
        )

    def count_active(self) -> int:
        """Return the count of currently active permits."""
        return self._db.execute(
            select(func.count())
            .select_from(Permit)
            .where(Permit.status == PermitStatus.ACTIVE)
        ).scalar_one()
