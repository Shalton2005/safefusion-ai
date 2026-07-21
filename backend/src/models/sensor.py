"""
Sensor ORM model for SafeFusion AI.

Maps to the ``sensors`` table.  Each row represents a single IoT / SCADA
sensor reading snapshot captured at a specific point in time.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base
from src.models.enums import SensorStatus, SensorType, enum_column


class Sensor(Base):
    """SQLAlchemy ORM model for an industrial sensor reading."""

    __tablename__ = "sensors"

    __table_args__ = (
        Index("ix_sensors_zone_timestamp", "zone", "timestamp"),
        Index("ix_sensors_sensor_type", "sensor_type"),
        Index("ix_sensors_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    zone: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="Plant zone identifier"
    )
    sensor_type: Mapped[SensorType] = mapped_column(enum_column(SensorType, length=20), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False, comment="Sensor reading value")
    unit: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="Measurement unit (e.g. °C, ppm, bar)"
    )
    status: Mapped[SensorStatus] = mapped_column(
        enum_column(SensorStatus, length=20),
        default=SensorStatus.NORMAL,
        nullable=False,
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
