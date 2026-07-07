"""
Sensor service layer for SafeFusion AI.

This module contains orchestration logic for the Sensor domain.
It avoids direct SQL and HTTP concerns.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.models.sensor import Sensor


class SensorRepositoryPort(Protocol):
    """Repository contract required by :class:`SensorService`."""

    def create(self, data: dict) -> Sensor: ...

    def get_by_id(self, record_id: UUID) -> Sensor | None: ...

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Sensor]: ...

    def update(self, record_id: UUID, data: dict) -> Sensor | None: ...

    def delete(self, record_id: UUID) -> bool: ...


class SensorAIPipelinePort(Protocol):
    """Optional AI extension points for sensor lifecycle events."""

    def on_sensor_created(self, sensor: Sensor) -> None: ...

    def on_sensor_updated(self, sensor: Sensor) -> None: ...

    def on_sensor_deleted(self, sensor_id: UUID) -> None: ...


class SensorService:
    """Business orchestration service for Sensor operations."""

    def __init__(
        self,
        repository: SensorRepositoryPort,
        ai_pipeline: SensorAIPipelinePort | None = None,
    ) -> None:
        self._repository = repository
        self._ai_pipeline = ai_pipeline

    def create_sensor(self, payload: dict) -> Sensor:
        sensor = self._repository.create(payload)
        if self._ai_pipeline is not None:
            self._ai_pipeline.on_sensor_created(sensor)
        return sensor

    def get_sensor_by_id(self, sensor_id: UUID) -> Sensor | None:
        return self._repository.get_by_id(sensor_id)

    def list_sensors(self, skip: int = 0, limit: int = 100) -> list[Sensor]:
        return self._repository.get_all(skip=skip, limit=limit)

    def update_sensor(self, sensor_id: UUID, payload: dict) -> Sensor | None:
        sensor = self._repository.update(sensor_id, payload)
        if sensor is not None and self._ai_pipeline is not None:
            self._ai_pipeline.on_sensor_updated(sensor)
        return sensor

    def delete_sensor(self, sensor_id: UUID) -> bool:
        deleted = self._repository.delete(sensor_id)
        if deleted and self._ai_pipeline is not None:
            self._ai_pipeline.on_sensor_deleted(sensor_id)
        return deleted
