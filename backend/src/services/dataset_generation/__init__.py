"""Synthetic dataset generation package for SafeFusion AI.

Generates realistic, cross-referenced datasets for seven entity types —
Workers, Permits, Equipment, Maintenance, Shift Schedules, Zones, and
Sensors — exportable as CSV or JSON. Supports a deterministic mode (fixed
seed) for reproducible demos and a random mode for varied synthetic data.

Framework- and DB-independent by design, matching
``src.services.sensor_simulator``: nothing here imports SQLAlchemy or
FastAPI. Each entity generator in
:mod:`src.services.dataset_generation.generators` is an independently
callable, independently testable pure function; ``DatasetGenerationService``
only sequences them in dependency order and threads through one shared,
optionally-seeded ``GenerationContext``.
"""

from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.entities import (
    DatasetEntity,
    Equipment,
    MaintenanceRecord,
    Permit,
    SensorReadingRecord,
    ShiftSchedule,
    Worker,
    Zone,
)
from src.services.dataset_generation.export import to_csv, to_json, write_csv, write_json
from src.services.dataset_generation.service import (
    DatasetGenerationConfig,
    DatasetGenerationService,
    GeneratedDataset,
)

__all__ = [
    "GenerationContext",
    "DatasetEntity",
    "Zone",
    "Worker",
    "Equipment",
    "Permit",
    "MaintenanceRecord",
    "ShiftSchedule",
    "SensorReadingRecord",
    "to_csv",
    "to_json",
    "write_csv",
    "write_json",
    "DatasetGenerationConfig",
    "DatasetGenerationService",
    "GeneratedDataset",
]
