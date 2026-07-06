"""
Worker repository for SafeFusion AI.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.enums import WorkerStatus
from src.models.worker import Worker
from src.repositories.base import BaseRepository


class WorkerRepository(BaseRepository[Worker]):
    """Data-access layer for the Worker aggregate."""

    def __init__(self, db: Session) -> None:
        super().__init__(Worker, db)

    def get_by_employee_id(self, employee_id: str) -> Worker | None:
        """Return the worker matching the given employee badge number."""
        return self._db.execute(
            select(Worker).where(Worker.employee_id == employee_id)
        ).scalar_one_or_none()

    def get_by_zone(self, zone: str) -> list[Worker]:
        """Return all workers currently located in the given plant zone."""
        return list(
            self._db.execute(
                select(Worker).where(Worker.current_zone == zone)
            ).scalars().all()
        )

    def count_by_status(self, status: WorkerStatus) -> int:
        """Return the count of workers with the specified status."""
        return self._db.execute(
            select(func.count())
            .select_from(Worker)
            .where(Worker.status == status)
        ).scalar_one()
