"""
MaintenanceLog service layer for SafeFusion AI.

Contains orchestration for MaintenanceLog CRUD operations.
This module intentionally has no SQL and no HTTP concerns.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.models.maintenance import MaintenanceLog


class MaintenanceLogRepositoryPort(Protocol):
    """Repository contract required by ``MaintenanceLogService``."""

    def create(self, data: dict) -> MaintenanceLog: ...

    def get_by_id(self, record_id: UUID) -> MaintenanceLog | None: ...

    def get_all(self, skip: int = 0, limit: int = 100) -> list[MaintenanceLog]: ...

    def update(self, record_id: UUID, data: dict) -> MaintenanceLog | None: ...

    def delete(self, record_id: UUID) -> bool: ...


class MaintenanceLogService:
    """Business orchestration service for maintenance log operations."""

    def __init__(self, repository: MaintenanceLogRepositoryPort) -> None:
        self._repository = repository

    def create_log(self, payload: dict) -> MaintenanceLog:
        return self._repository.create(payload)

    def get_log_by_id(self, log_id: UUID) -> MaintenanceLog | None:
        return self._repository.get_by_id(log_id)

    def list_logs(self, skip: int = 0, limit: int = 100) -> list[MaintenanceLog]:
        return self._repository.get_all(skip=skip, limit=limit)

    def update_log(self, log_id: UUID, payload: dict) -> MaintenanceLog | None:
        return self._repository.update(log_id, payload)

    def delete_log(self, log_id: UUID) -> bool:
        return self._repository.delete(log_id)
