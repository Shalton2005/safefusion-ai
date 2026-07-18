"""Entity dataclasses produced by the SafeFusion AI dataset generators.

Standalone and DB-independent, mirroring the same design choice made for
``src.services.sensor_simulator.schemas.SensorKind``: these shapes describe
what the *generators* produce, not what any ORM model persists. Two of the
seven entities here (``Equipment``, ``ShiftSchedule``) have no ORM model at
all in this codebase, and the other five (``Worker``, ``Permit``,
``MaintenanceLog``, ``Sensor``, plus the implicit ``Zone`` concept) are
intentionally not imported from ``src.models`` so the generator package has
no SQLAlchemy/DB dependency and can run standalone (e.g. in a notebook or
CI job with no database configured).

Every dataclass exposes ``as_dict()`` returning JSON/CSV-safe primitives
(enums -> their ``.value``, ``datetime`` -> ISO 8601 strings) so the
exporters in :mod:`src.services.dataset_generation.export` never need to
know about a specific entity's field types.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any


def _to_jsonable(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, datetime):
        return value.isoformat()
    return value


class DatasetEntity:
    """Mixin providing a uniform, export-ready ``as_dict()`` for dataclasses."""

    def as_dict(self) -> dict[str, Any]:
        return {key: _to_jsonable(value) for key, value in asdict(self).items()}


@dataclass(frozen=True)
class Zone(DatasetEntity):
    zone_id: str
    name: str
    building: str
    hazard_category: str
    is_restricted: bool


@dataclass(frozen=True)
class Worker(DatasetEntity):
    employee_id: str
    name: str
    department: str
    role: str
    zone_id: str
    shift: str
    status: str
    ppe_status: bool
    hire_date: datetime


@dataclass(frozen=True)
class Equipment(DatasetEntity):
    equipment_id: str
    name: str
    category: str
    zone_id: str
    manufacturer: str
    install_date: datetime
    criticality: str


@dataclass(frozen=True)
class Permit(DatasetEntity):
    permit_id: str
    permit_type: str
    zone_id: str
    equipment_id: str
    issued_by: str
    assigned_team: str
    start_time: datetime
    end_time: datetime
    status: str


@dataclass(frozen=True)
class MaintenanceRecord(DatasetEntity):
    record_id: str
    equipment_id: str
    maintenance_type: str
    assigned_team: str
    status: str
    start_time: datetime
    end_time: datetime | None


@dataclass(frozen=True)
class ShiftSchedule(DatasetEntity):
    schedule_id: str
    employee_id: str
    zone_id: str
    shift: str
    shift_date: datetime
    start_time: datetime
    end_time: datetime


@dataclass(frozen=True)
class SensorReadingRecord(DatasetEntity):
    sensor_id: str
    zone_id: str
    kind: str
    value: float
    unit: str
    status: str
    timestamp: datetime
