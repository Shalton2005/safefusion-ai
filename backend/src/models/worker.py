"""
Worker ORM model for SafeFusion AI.

Maps to the ``workers`` table and stores plant worker details,
current zone location, PPE compliance, and operational status.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base
from src.models.enums import WorkerStatus, enum_column


class Worker(Base):
    """SQLAlchemy ORM model for a plant worker tracked by the safety system."""

    __tablename__ = "workers"

    __table_args__ = (
        Index("ix_workers_department", "department"),
        Index("ix_workers_current_zone", "current_zone"),
        Index("ix_workers_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique worker identifier (UUID v4)",
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    employee_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, comment="Employee badge number"
    )
    department: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="Organisational department"
    )
    role: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="Job title / role"
    )
    current_zone: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Current plant zone"
    )
    ppe_status: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="True when PPE-compliant",
    )
    shift: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="Morning / Afternoon / Night"
    )
    status: Mapped[WorkerStatus] = mapped_column(
        enum_column(WorkerStatus, length=20),
        default=WorkerStatus.WORKING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
