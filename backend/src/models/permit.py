"""
Permit-to-Work ORM model for SafeFusion AI.

Maps to the ``permits`` table and stores active and historical
Permit-to-Work (PTW) records for controlled high-risk tasks.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base
from src.models.enums import PermitStatus, PermitType


class Permit(Base):
    """SQLAlchemy ORM model for a Permit-to-Work record."""

    __tablename__ = "permits"

    __table_args__ = (
        Index("ix_permits_zone", "zone"),
        Index("ix_permits_status", "status"),
        Index("ix_permits_permit_type", "permit_type"),
        Index("ix_permits_end_time", "end_time"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    permit_type: Mapped[PermitType] = mapped_column(
        Enum(PermitType, native_enum=False, length=30), nullable=False
    )
    zone: Mapped[str] = mapped_column(String(50), nullable=False)
    issued_by: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="Safety officer who issued the permit"
    )
    assigned_team: Mapped[str] = mapped_column(String(100), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="Permit expiry time"
    )
    status: Mapped[PermitStatus] = mapped_column(
        Enum(PermitStatus, native_enum=False, length=20),
        default=PermitStatus.ACTIVE,
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
