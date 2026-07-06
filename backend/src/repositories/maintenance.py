"""
Maintenance Log repository for SafeFusion AI.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.enums import MaintenanceStatus
from src.models.maintenance import MaintenanceLog
from src.repositories.base import BaseRepository


class MaintenanceLogRepository(BaseRepository[MaintenanceLog]):
    """Data-access layer for the MaintenanceLog aggregate."""

    def __init__(self, db: Session) -> None:
        super().__init__(MaintenanceLog, db)

    def get_by_status(self, status: MaintenanceStatus) -> list[MaintenanceLog]:
        """Return all maintenance logs with the specified status."""
        return list(
            self._db.execute(
                select(MaintenanceLog).where(MaintenanceLog.status == status)
            ).scalars().all()
        )

    def get_by_equipment(self, equipment_id: str) -> list[MaintenanceLog]:
        """Return all maintenance logs for the given equipment ID."""
        return list(
            self._db.execute(
                select(MaintenanceLog)
                .where(MaintenanceLog.equipment_id == equipment_id)
                .order_by(MaintenanceLog.created_at.desc())
            ).scalars().all()
        )
