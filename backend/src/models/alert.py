"""
Alert ORM model for SafeFusion AI.

Maps to the ``alerts`` table and stores AI-generated safety alerts
produced by the detection and risk-analysis engines.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base
from src.models.enums import AlertSeverity, AlertSource, AlertStatus, AlertType


class Alert(Base):
    """SQLAlchemy ORM model for an AI-generated safety alert."""

    __tablename__ = "alerts"

    __table_args__ = (
        Index("ix_alerts_status", "status"),
        Index("ix_alerts_alert_type", "alert_type"),
        Index("ix_alerts_zone", "zone"),
        Index("ix_alerts_generated_at", "generated_at"),
        Index("ix_alerts_severity", "severity"),
        Index("ix_alerts_source", "source"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    zone: Mapped[str] = mapped_column(String(50), nullable=False)
    alert_type: Mapped[AlertType] = mapped_column(
        Enum(AlertType, native_enum=False, length=20), nullable=False
    )
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, native_enum=False, length=20),
        nullable=False,
        default=AlertSeverity.MEDIUM,
        comment="Alert severity assigned by the rule that generated it",
    )
    source: Mapped[AlertSource] = mapped_column(
        Enum(AlertSource, native_enum=False, length=30),
        nullable=False,
        default=AlertSource.SENSOR_MONITORING,
        comment="Monitoring subsystem that produced the triggering data",
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    generated_by: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="AI Engine",
        comment="Source system that generated the alert",
    )
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, native_enum=False, length=20),
        default=AlertStatus.ACTIVE,
        nullable=False,
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
