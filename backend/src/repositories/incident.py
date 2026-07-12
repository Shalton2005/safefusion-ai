"""
Incident repository for SafeFusion AI.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.enums import IncidentType, SeverityLevel
from src.models.incident import Incident
from src.repositories.base import BaseRepository


class IncidentRepository(BaseRepository[Incident]):
    """Data-access layer for the Incident aggregate."""

    def __init__(self, db: Session) -> None:
        super().__init__(Incident, db)

    def get_by_severity(self, severity: SeverityLevel) -> list[Incident]:
        """Return all incidents matching the given severity level."""
        return list(
            self._db.execute(
                select(Incident)
                .where(Incident.severity == severity)
                .order_by(Incident.occurred_at.desc())
            ).scalars().all()
        )

    def get_by_zone(self, zone: str) -> list[Incident]:
        """Return all incidents that occurred in the given plant zone."""
        return list(
            self._db.execute(
                select(Incident)
                .where(Incident.zone == zone)
                .order_by(Incident.occurred_at.desc())
            ).scalars().all()
        )

    def get_by_type(self, incident_type: IncidentType) -> list[Incident]:
        """Return all incidents of the specified type."""
        return list(
            self._db.execute(
                select(Incident).where(Incident.incident_type == incident_type)
            ).scalars().all()
        )

    def get_most_recent(self) -> Incident | None:
        """Return the incident with the latest ``occurred_at``, or ``None`` if there are none."""
        return self._db.execute(
            select(Incident).order_by(Incident.occurred_at.desc()).limit(1)
        ).scalar_one_or_none()
