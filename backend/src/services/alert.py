"""
Alert service layer for SafeFusion AI.

This module contains orchestration logic for the Alert domain.
It avoids direct SQL and HTTP concerns.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.models.alert import Alert


class AlertRepositoryPort(Protocol):
    """Repository contract required by :class:`AlertService`."""

    def create(self, data: dict) -> Alert: ...

    def get_by_id(self, record_id: UUID) -> Alert | None: ...

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Alert]: ...

    def update(self, record_id: UUID, data: dict) -> Alert | None: ...

    def delete(self, record_id: UUID) -> bool: ...

    def delete_all(self) -> int: ...


class AlertAIPipelinePort(Protocol):
    """Optional AI extension points for alert lifecycle events."""

    def on_alert_created(self, alert: Alert) -> None: ...

    def on_alert_updated(self, alert: Alert) -> None: ...

    def on_alert_deleted(self, alert_id: UUID) -> None: ...


class AlertService:
    """Business orchestration service for Alert operations."""

    def __init__(
        self,
        repository: AlertRepositoryPort,
        ai_pipeline: AlertAIPipelinePort | None = None,
    ) -> None:
        self._repository = repository
        self._ai_pipeline = ai_pipeline

    def create_alert(self, payload: dict) -> Alert:
        alert = self._repository.create(payload)
        if self._ai_pipeline is not None:
            self._ai_pipeline.on_alert_created(alert)
        return alert

    def get_alert_by_id(self, alert_id: UUID) -> Alert | None:
        return self._repository.get_by_id(alert_id)

    def list_alerts(self, skip: int = 0, limit: int = 100) -> list[Alert]:
        return self._repository.get_all(skip=skip, limit=limit)

    def update_alert(self, alert_id: UUID, payload: dict) -> Alert | None:
        alert = self._repository.update(alert_id, payload)
        if alert is not None and self._ai_pipeline is not None:
            self._ai_pipeline.on_alert_updated(alert)
        return alert

    def delete_alert(self, alert_id: UUID) -> bool:
        deleted = self._repository.delete(alert_id)
        if deleted and self._ai_pipeline is not None:
            self._ai_pipeline.on_alert_deleted(alert_id)
        return deleted

    def delete_all_alerts(self) -> int:
        return self._repository.delete_all()
