"""
Incident ORM model for SafeFusion AI.

Maps to the ``incidents`` table and stores historical and simulated
industrial incidents used for analytics, reporting, and RAG input.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base
from src.models.enums import IncidentType, SeverityLevel


class Incident(Base):
    """SQLAlchemy ORM model for an industrial safety incident."""

    __tablename__ = "incidents"

    __table_args__ = (
        Index("ix_incidents_zone", "zone"),
        Index("ix_incidents_severity", "severity"),
        Index("ix_incidents_incident_type", "incident_type"),
        Index("ix_incidents_occurred_at", "occurred_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    zone: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[SeverityLevel] = mapped_column(
        Enum(SeverityLevel, native_enum=False, length=20), nullable=False
    )
    incident_type: Mapped[IncidentType] = mapped_column(
        Enum(IncidentType, native_enum=False, length=30), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
