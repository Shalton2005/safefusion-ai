"""
Alert repository for SafeFusion AI.
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.alert import Alert
from src.models.enums import AlertStatus, AlertType
from src.repositories.base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    """Data-access layer for the Alert aggregate."""

    def __init__(self, db: Session) -> None:
        super().__init__(Alert, db)

    def get_active(self) -> list[Alert]:
        """Return all alerts with status ``active``."""
        return list(
            self._db.execute(
                select(Alert)
                .where(Alert.status == AlertStatus.ACTIVE)
                .order_by(Alert.generated_at.desc())
            ).scalars().all()
        )

    def count_active(self) -> int:
        """Return the count of active alerts."""
        return self._db.execute(
            select(func.count())
            .select_from(Alert)
            .where(Alert.status == AlertStatus.ACTIVE)
        ).scalar_one()

    def count_critical_active(self) -> int:
        """Return the count of active critical alerts."""
        return self._db.execute(
            select(func.count())
            .select_from(Alert)
            .where(Alert.alert_type == AlertType.CRITICAL, Alert.status == AlertStatus.ACTIVE)
        ).scalar_one()

    def acknowledge(self, alert_id: UUID) -> Alert | None:
        """Transition the given alert to ``acknowledged`` status.

        Returns:
            The updated alert, or ``None`` if the ID was not found.
        """
        return self.update(alert_id, {"status": AlertStatus.ACKNOWLEDGED})

    def resolve(self, alert_id: UUID) -> Alert | None:
        """Transition the given alert to ``resolved`` status."""
        return self.update(alert_id, {"status": AlertStatus.RESOLVED})
