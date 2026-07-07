"""
Worker service layer for SafeFusion AI.

This module contains orchestration logic for the Worker domain.
It intentionally does not perform SQL queries directly and does not
contain HTTP concerns.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.models.worker import Worker


class WorkerRepositoryPort(Protocol):
    """Repository contract required by :class:`WorkerService`.

    Keeping this as a protocol makes the service easy to unit test with
    fake repositories and keeps the implementation independent of a
    specific data-access class.
    """

    def create(self, data: dict) -> Worker: ...

    def get_by_id(self, record_id: UUID) -> Worker | None: ...

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Worker]: ...

    def update(self, record_id: UUID, data: dict) -> Worker | None: ...

    def delete(self, record_id: UUID) -> bool: ...


class WorkerAIPipelinePort(Protocol):
    """Optional AI extension points for worker lifecycle events."""

    def on_worker_created(self, worker: Worker) -> None: ...

    def on_worker_updated(self, worker: Worker) -> None: ...

    def on_worker_deleted(self, worker_id: UUID) -> None: ...


class WorkerService:
    """Business orchestration service for Worker operations.

    The service delegates persistence to an injected repository and keeps
    room for future AI orchestration through optional lifecycle hooks.
    """

    def __init__(
        self,
        repository: WorkerRepositoryPort,
        ai_pipeline: WorkerAIPipelinePort | None = None,
    ) -> None:
        self._repository = repository
        self._ai_pipeline = ai_pipeline

    def create_worker(self, payload: dict) -> Worker:
        """Create a worker record and trigger post-create orchestration."""
        worker = self._repository.create(payload)
        if self._ai_pipeline is not None:
            self._ai_pipeline.on_worker_created(worker)
        return worker

    def get_worker_by_id(self, worker_id: UUID) -> Worker | None:
        """Return a worker by ID."""
        return self._repository.get_by_id(worker_id)

    def list_workers(self, skip: int = 0, limit: int = 100) -> list[Worker]:
        """Return paginated workers."""
        return self._repository.get_all(skip=skip, limit=limit)

    def update_worker(self, worker_id: UUID, payload: dict) -> Worker | None:
        """Update a worker and trigger post-update orchestration."""
        worker = self._repository.update(worker_id, payload)
        if worker is not None and self._ai_pipeline is not None:
            self._ai_pipeline.on_worker_updated(worker)
        return worker

    def delete_worker(self, worker_id: UUID) -> bool:
        """Delete a worker and trigger post-delete orchestration."""
        deleted = self._repository.delete(worker_id)
        if deleted and self._ai_pipeline is not None:
            self._ai_pipeline.on_worker_deleted(worker_id)
        return deleted
