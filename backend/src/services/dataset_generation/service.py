"""Orchestrator for the SafeFusion AI dataset generation pipeline.

Runs every entity generator in dependency order (zones -> workers ->
equipment -> permits/maintenance/shift-schedules -> sensors) against one
shared ``GenerationContext``, so a single ``seed`` produces the same full
dataset — including cross-entity references like which zone a permit
covers or which equipment a maintenance record is for — every time.

Generators stay decoupled from this orchestration: ``DatasetGenerationService``
is the only module that knows the dependency order, and each generator
function remains independently callable/testable (see
``src.services.dataset_generation.generators``).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.entities import (
    Equipment,
    MaintenanceRecord,
    Permit,
    SensorReadingRecord,
    ShiftSchedule,
    Worker,
    Zone,
)
from src.services.dataset_generation.generators import (
    generate_equipment,
    generate_maintenance_records,
    generate_permits,
    generate_sensor_readings,
    generate_shift_schedules,
    generate_workers,
    generate_zones,
)


@dataclass(frozen=True)
class DatasetGenerationConfig:
    """Record counts and options for one dataset generation run."""

    zone_count: int | None = None
    worker_count: int = 50
    equipment_count: int = 30
    permit_count: int = 40
    maintenance_count: int = 60
    shift_schedule_days: int = 7
    sensor_ticks: int = 1
    sensor_interval_seconds: float = 300.0
    deterministic_sensors: bool = False
    seed: int | None = None
    anchor_time: datetime | None = None
    """Reference "now" every generator computes relative offsets from.

    Defaults to the moment ``generate()`` runs. Pin this explicitly
    alongside ``seed`` for byte-identical output across separate runs —
    otherwise two seeded runs a moment apart still differ in fields like
    ``hire_date`` or sensor timestamps, which are computed relative to
    this anchor.
    """


@dataclass(frozen=True)
class GeneratedDataset:
    """The full set of entity records produced by one generation run."""

    zones: list[Zone] = field(default_factory=list)
    workers: list[Worker] = field(default_factory=list)
    equipment: list[Equipment] = field(default_factory=list)
    permits: list[Permit] = field(default_factory=list)
    maintenance_records: list[MaintenanceRecord] = field(default_factory=list)
    shift_schedules: list[ShiftSchedule] = field(default_factory=list)
    sensor_readings: list[SensorReadingRecord] = field(default_factory=list)

    def as_named_collections(self) -> dict[str, list]:
        """Return {entity_name: records} for iteration by exporters/CLI."""
        return {
            "zones": self.zones,
            "workers": self.workers,
            "equipment": self.equipment,
            "permits": self.permits,
            "maintenance_records": self.maintenance_records,
            "shift_schedules": self.shift_schedules,
            "sensor_readings": self.sensor_readings,
        }


class DatasetGenerationService:
    """Generates a full, cross-referenced synthetic dataset in one call."""

    def generate(self, config: DatasetGenerationConfig) -> GeneratedDataset:
        context = (
            GenerationContext(seed=config.seed, anchor_time=config.anchor_time)
            if config.anchor_time is not None
            else GenerationContext(seed=config.seed)
        )

        zones = generate_zones(context, count=config.zone_count)
        workers = generate_workers(context, count=config.worker_count, zones=zones)
        equipment = generate_equipment(context, count=config.equipment_count, zones=zones)
        permits = generate_permits(context, count=config.permit_count, zones=zones, equipment=equipment)
        maintenance_records = generate_maintenance_records(
            context, count=config.maintenance_count, equipment=equipment
        )
        shift_schedules = generate_shift_schedules(
            context, workers=workers, days_back=config.shift_schedule_days
        )
        sensor_readings = generate_sensor_readings(
            context,
            zones=zones,
            ticks=config.sensor_ticks,
            interval_seconds=config.sensor_interval_seconds,
            deterministic=config.deterministic_sensors,
        )

        return GeneratedDataset(
            zones=zones,
            workers=workers,
            equipment=equipment,
            permits=permits,
            maintenance_records=maintenance_records,
            shift_schedules=shift_schedules,
            sensor_readings=sensor_readings,
        )
