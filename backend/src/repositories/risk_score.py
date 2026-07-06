"""
Risk Score repository for SafeFusion AI.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.risk_score import RiskScore
from src.repositories.base import BaseRepository


class RiskScoreRepository(BaseRepository[RiskScore]):
    """Data-access layer for the RiskScore aggregate."""

    def __init__(self, db: Session) -> None:
        super().__init__(RiskScore, db)

    def get_latest(self) -> RiskScore | None:
        """Return the single most recently analyzed risk score across all zones."""
        return self._db.execute(
            select(RiskScore).order_by(RiskScore.analyzed_at.desc()).limit(1)
        ).scalar_one_or_none()

    def get_by_zone(self, zone: str) -> list[RiskScore]:
        """Return all risk score records for the given zone, newest first."""
        return list(
            self._db.execute(
                select(RiskScore)
                .where(RiskScore.zone == zone)
                .order_by(RiskScore.analyzed_at.desc())
            ).scalars().all()
        )

    def get_latest_by_zone(self, zone: str) -> RiskScore | None:
        """Return the most recent risk score for the given zone."""
        return self._db.execute(
            select(RiskScore)
            .where(RiskScore.zone == zone)
            .order_by(RiskScore.analyzed_at.desc())
            .limit(1)
        ).scalar_one_or_none()
