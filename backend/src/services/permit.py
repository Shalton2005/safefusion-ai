"""
Permit service layer for SafeFusion AI.

This module contains orchestration logic for the Permit domain.
It avoids direct SQL and HTTP concerns.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.models.permit import Permit


class PermitRepositoryPort(Protocol):
    """Repository contract required by :class:`PermitService`."""

    def create(self, data: dict) -> Permit: ...

    def get_by_id(self, record_id: UUID) -> Permit | None: ...

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Permit]: ...

    def update(self, record_id: UUID, data: dict) -> Permit | None: ...

    def delete(self, record_id: UUID) -> bool: ...


class PermitAIPipelinePort(Protocol):
    """Optional AI extension points for permit lifecycle events."""

    def on_permit_created(self, permit: Permit) -> None: ...

    def on_permit_updated(self, permit: Permit) -> None: ...

    def on_permit_deleted(self, permit_id: UUID) -> None: ...


class PermitService:
    """Business orchestration service for Permit operations."""

    def __init__(
        self,
        repository: PermitRepositoryPort,
        ai_pipeline: PermitAIPipelinePort | None = None,
    ) -> None:
        self._repository = repository
        self._ai_pipeline = ai_pipeline

    def create_permit(self, payload: dict) -> Permit:
        permit = self._repository.create(payload)
        if self._ai_pipeline is not None:
            self._ai_pipeline.on_permit_created(permit)
        return permit

    def get_permit_by_id(self, permit_id: UUID) -> Permit | None:
        return self._repository.get_by_id(permit_id)

    def list_permits(self, skip: int = 0, limit: int = 100) -> list[Permit]:
        return self._repository.get_all(skip=skip, limit=limit)

    def update_permit(self, permit_id: UUID, payload: dict) -> Permit | None:
        permit = self._repository.update(permit_id, payload)
        if permit is not None and self._ai_pipeline is not None:
            self._ai_pipeline.on_permit_updated(permit)
        return permit

    def delete_permit(self, permit_id: UUID) -> bool:
        deleted = self._repository.delete(permit_id)
        if deleted and self._ai_pipeline is not None:
            self._ai_pipeline.on_permit_deleted(permit_id)
        return deleted
