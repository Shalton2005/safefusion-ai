"""
Risk Score ORM model for SafeFusion AI.

Maps to the ``risk_scores`` table and stores AI-generated compound
risk analysis results for individual plant zones.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base
from src.models.enums import RiskLevel


class RiskScore(Base):
    """SQLAlchemy ORM model for an AI-generated zone risk analysis result."""

    __tablename__ = "risk_scores"

    __table_args__ = (
        Index("ix_risk_scores_zone", "zone"),
        Index("ix_risk_scores_risk_level", "risk_level"),
        Index("ix_risk_scores_analyzed_at", "analyzed_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    zone: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_score: Mapped[float] = mapped_column(
        Float, nullable=False, comment="Compound risk score between 0.0 and 100.0"
    )
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, native_enum=False, length=20), nullable=False
    )
    contributing_factors: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
