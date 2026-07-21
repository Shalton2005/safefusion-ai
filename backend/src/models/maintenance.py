"""
Maintenance Log ORM model for SafeFusion AI.

Maps to the ``maintenance_logs`` table and tracks maintenance
activities for industrial equipment throughout their lifecycle.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base
from src.models.enums import MaintenanceStatus, MaintenanceType, enum_column


class MaintenanceLog(Base):
    """SQLAlchemy ORM model for an equipment maintenance activity."""

    __tablename__ = "maintenance_logs"

    __table_args__ = (
        Index("ix_maintenance_logs_equipment_id", "equipment_id"),
        Index("ix_maintenance_logs_status", "status"),
        Index("ix_maintenance_logs_maintenance_type", "maintenance_type"),
        Index("ix_maintenance_logs_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    equipment_id: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="Equipment reference code"
    )
    equipment_name: Mapped[str] = mapped_column(String(100), nullable=False)
    maintenance_type: Mapped[MaintenanceType] = mapped_column(
        enum_column(MaintenanceType, length=20), nullable=False
    )
    assigned_team: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[MaintenanceStatus] = mapped_column(
        enum_column(MaintenanceStatus, length=20),
        default=MaintenanceStatus.PLANNED,
        nullable=False,
    )
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
