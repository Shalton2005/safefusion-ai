"""
RiskScore service layer for SafeFusion AI.

Contains orchestration for RiskAssessment (risk score) CRUD operations.
This module intentionally has no SQL and no HTTP concerns.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.models.risk_score import RiskScore


class RiskScoreRepositoryPort(Protocol):
    """Repository contract required by ``RiskScoreService``."""

    def create(self, data: dict) -> RiskScore: ...

    def get_by_id(self, record_id: UUID) -> RiskScore | None: ...

    def get_all(self, skip: int = 0, limit: int = 100) -> list[RiskScore]: ...

    def update(self, record_id: UUID, data: dict) -> RiskScore | None: ...

    def delete(self, record_id: UUID) -> bool: ...


class RiskScoreService:
    """Business orchestration service for risk score operations."""

    def __init__(self, repository: RiskScoreRepositoryPort) -> None:
        self._repository = repository

    def create_risk_score(self, payload: dict) -> RiskScore:
        return self._repository.create(payload)

    def get_risk_score_by_id(self, score_id: UUID) -> RiskScore | None:
        return self._repository.get_by_id(score_id)

    def list_risk_scores(self, skip: int = 0, limit: int = 100) -> list[RiskScore]:
        return self._repository.get_all(skip=skip, limit=limit)

    def update_risk_score(self, score_id: UUID, payload: dict) -> RiskScore | None:
        return self._repository.update(score_id, payload)

    def delete_risk_score(self, score_id: UUID) -> bool:
        return self._repository.delete(score_id)
