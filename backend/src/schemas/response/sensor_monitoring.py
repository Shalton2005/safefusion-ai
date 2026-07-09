"""Response schemas for sensor monitoring summaries."""

import uuid
from datetime import datetime

from src.models.enums import SensorStatus, SensorType
from src.schemas.base import AppBaseModel


class SensorThresholdBandResponse(AppBaseModel):
    """Threshold boundaries used for classifying a sensor reading."""

    warning_min: float | None = None
    warning_max: float | None = None
    critical_min: float | None = None
    critical_max: float | None = None


class SensorMonitoringStatusCounts(AppBaseModel):
    """Count summary split by sensor status."""

    normal: int
    warning: int
    critical: int
    total: int


class SensorMonitoringItem(AppBaseModel):
    """Single monitored sensor reading with computed status."""

    id: uuid.UUID
    zone: str
    sensor_type: SensorType
    value: float
    unit: str
    timestamp: datetime
    stored_status: SensorStatus
    computed_status: SensorStatus
    thresholds: SensorThresholdBandResponse


class SensorTypeMonitoringSummary(AppBaseModel):
    """Status summary for one sensor type."""

    sensor_type: SensorType
    counts: SensorMonitoringStatusCounts


class SensorMonitoringSummaryResponse(AppBaseModel):
    """Top-level structured monitoring summary payload."""

    generated_at: datetime
    overall_status: SensorStatus
    total_sensors: int
    counts: SensorMonitoringStatusCounts
    by_type: list[SensorTypeMonitoringSummary]
    sensors: list[SensorMonitoringItem]