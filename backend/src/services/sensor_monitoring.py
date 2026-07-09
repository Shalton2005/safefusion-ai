"""Sensor monitoring service for rule-based status classification."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Mapping, Protocol

from src.models.enums import SensorStatus, SensorType
from src.models.sensor import Sensor


@dataclass(frozen=True)
class SensorThresholdBand:
    """Thresholds for one sensor type.

    A value is:
      - critical if it crosses any critical bound
      - warning if it crosses any warning bound
      - normal otherwise
    """

    warning_min: float | None = None
    warning_max: float | None = None
    critical_min: float | None = None
    critical_max: float | None = None


class SensorMonitoringRepositoryPort(Protocol):
    """Repository contract required by ``SensorMonitoringService``."""

    def get_latest_by_zone_and_type(self) -> list[Sensor]: ...


class SensorClassifierPort(Protocol):
    """Classifier contract so AI-driven classifiers can be introduced later."""

    def classify(self, value: float, thresholds: SensorThresholdBand) -> SensorStatus: ...


class ThresholdSensorClassifier(SensorClassifierPort):
    """Default rule-based classifier based on numeric threshold bands."""

    def classify(self, value: float, thresholds: SensorThresholdBand) -> SensorStatus:
        if (
            (thresholds.critical_min is not None and value <= thresholds.critical_min)
            or (thresholds.critical_max is not None and value >= thresholds.critical_max)
        ):
            return SensorStatus.CRITICAL

        if (
            (thresholds.warning_min is not None and value <= thresholds.warning_min)
            or (thresholds.warning_max is not None and value >= thresholds.warning_max)
        ):
            return SensorStatus.WARNING

        return SensorStatus.NORMAL


class SensorMonitoringService:
    """Orchestrates monitoring classification from persisted sensor readings."""

    def __init__(
        self,
        repository: SensorMonitoringRepositoryPort,
        thresholds: Mapping[SensorType, SensorThresholdBand],
        classifier: SensorClassifierPort | None = None,
    ) -> None:
        self._repository = repository
        self._thresholds = dict(thresholds)
        self._classifier = classifier or ThresholdSensorClassifier()

    def get_monitoring_summary(self) -> dict:
        """Return structured monitoring summary for latest readings."""
        readings = self._repository.get_latest_by_zone_and_type()

        overall_counts = self._empty_counts()
        by_type_counts: dict[SensorType, dict[str, int]] = {
            sensor_type: self._empty_counts() for sensor_type in self._thresholds.keys()
        }
        sensors: list[dict] = []

        for reading in readings:
            thresholds = self._thresholds.get(reading.sensor_type, SensorThresholdBand())
            computed_status = self._classifier.classify(reading.value, thresholds)
            self._increment_count(overall_counts, computed_status)

            if reading.sensor_type not in by_type_counts:
                by_type_counts[reading.sensor_type] = self._empty_counts()
            self._increment_count(by_type_counts[reading.sensor_type], computed_status)

            sensors.append(
                {
                    "id": reading.id,
                    "zone": reading.zone,
                    "sensor_type": reading.sensor_type,
                    "value": reading.value,
                    "unit": reading.unit,
                    "timestamp": reading.timestamp,
                    "stored_status": reading.status,
                    "computed_status": computed_status,
                    "thresholds": {
                        "warning_min": thresholds.warning_min,
                        "warning_max": thresholds.warning_max,
                        "critical_min": thresholds.critical_min,
                        "critical_max": thresholds.critical_max,
                    },
                }
            )

        by_type = [
            {
                "sensor_type": sensor_type,
                "counts": counts,
            }
            for sensor_type, counts in by_type_counts.items()
            if counts["total"] > 0
        ]

        overall_status = SensorStatus.NORMAL
        if overall_counts["critical"] > 0:
            overall_status = SensorStatus.CRITICAL
        elif overall_counts["warning"] > 0:
            overall_status = SensorStatus.WARNING

        return {
            "generated_at": datetime.now(timezone.utc),
            "overall_status": overall_status,
            "total_sensors": len(readings),
            "counts": overall_counts,
            "by_type": by_type,
            "sensors": sensors,
        }

    @staticmethod
    def _empty_counts() -> dict[str, int]:
        return {"normal": 0, "warning": 0, "critical": 0, "total": 0}

    @staticmethod
    def _increment_count(counts: dict[str, int], status: SensorStatus) -> None:
        if status == SensorStatus.NORMAL:
            counts["normal"] += 1
        elif status == SensorStatus.WARNING:
            counts["warning"] += 1
        else:
            counts["critical"] += 1
        counts["total"] += 1