"""
Incident service layer for SafeFusion AI.

Contains orchestration for Incident CRUD operations.
This module intentionally has no SQL and no HTTP concerns.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.models.incident import Incident


class IncidentRepositoryPort(Protocol):
    """Repository contract required by ``IncidentService``."""

    def create(self, data: dict) -> Incident: ...

    def get_by_id(self, record_id: UUID) -> Incident | None: ...

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Incident]: ...

    def update(self, record_id: UUID, data: dict) -> Incident | None: ...

    def delete(self, record_id: UUID) -> bool: ...


class IncidentService:
    """Business orchestration service for incident operations."""

    def __init__(self, repository: IncidentRepositoryPort) -> None:
        self._repository = repository

    def create_incident(self, payload: dict) -> Incident:
        return self._repository.create(payload)

    def get_incident_by_id(self, incident_id: UUID) -> Incident | None:
        return self._repository.get_by_id(incident_id)

    def list_incidents(self, skip: int = 0, limit: int = 100) -> list[Incident]:
        return self._repository.get_all(skip=skip, limit=limit)

    def update_incident(self, incident_id: UUID, payload: dict) -> Incident | None:
        return self._repository.update(incident_id, payload)

    def delete_incident(self, incident_id: UUID) -> bool:
        return self._repository.delete(incident_id)
