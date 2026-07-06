"""
Sensor repository for SafeFusion AI.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models.enums import SensorStatus, SensorType
from src.models.sensor import Sensor
from src.repositories.base import BaseRepository


class SensorRepository(BaseRepository[Sensor]):
    """Data-access layer for the Sensor aggregate."""

    def __init__(self, db: Session) -> None:
        super().__init__(Sensor, db)

    def get_by_zone(self, zone: str) -> list[Sensor]:
        """Return all sensor readings for the given plant zone."""
        return list(
            self._db.execute(
                select(Sensor)
                .where(Sensor.zone == zone)
                .order_by(Sensor.timestamp.desc())
            ).scalars().all()
        )

    def get_by_type(self, sensor_type: SensorType) -> list[Sensor]:
        """Return all sensor readings of the given sensor type."""
        return list(
            self._db.execute(
                select(Sensor).where(Sensor.sensor_type == sensor_type)
            ).scalars().all()
        )

    def get_distinct_zones(self) -> list[str]:
        """Return a sorted list of all unique zone identifiers in the sensors table."""
        rows = self._db.execute(
            select(Sensor.zone).distinct().order_by(Sensor.zone)
        ).scalars().all()
        return list(rows)

    def count_by_zone_and_status(self, zone: str, status: SensorStatus) -> int:
        """Return the count of readings for a zone filtered by status."""
        return self._db.execute(
            select(func.count())
            .select_from(Sensor)
            .where(Sensor.zone == zone, Sensor.status == status)
        ).scalar_one()

    def count_by_status(self, status: SensorStatus) -> int:
        """Return the total count of readings with the given status."""
        return self._db.execute(
            select(func.count())
            .select_from(Sensor)
            .where(Sensor.status == status)
        ).scalar_one()
