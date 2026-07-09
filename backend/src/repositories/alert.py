"""
Alert repository for SafeFusion AI.
"""

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.models.alert import Alert
from src.models.enums import AlertSeverity, AlertStatus, AlertType
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
        """Return the count of active alerts that are urgent by either severity signal.

        Counts alerts flagged via the legacy ``alert_type`` field (CRITICAL)
        or the newer, more granular ``severity`` field (CRITICAL/HIGH), since
        rule-generated alerts (e.g. an expired permit) may carry
        ``alert_type=WARNING`` alongside ``severity=HIGH`` and would
        otherwise be invisible to this count.
        """
        return self._db.execute(
            select(func.count())
            .select_from(Alert)
            .where(
                Alert.status == AlertStatus.ACTIVE,
                or_(
                    Alert.alert_type == AlertType.CRITICAL,
                    Alert.severity.in_([AlertSeverity.CRITICAL, AlertSeverity.HIGH]),
                ),
            )
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
