"""Tests for individual SafeFusion AI dataset entity generators."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.generators import (
    generate_equipment,
    generate_maintenance_records,
    generate_permits,
    generate_sensor_readings,
    generate_shift_schedules,
    generate_workers,
    generate_zones,
)

ANCHOR = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _context(seed: int | None = 42) -> GenerationContext:
    return GenerationContext(seed=seed, anchor_time=ANCHOR)


class TestGenerateZones:
    def test_defaults_to_full_catalog(self) -> None:
        zones = generate_zones(_context())
        assert len(zones) > 0
        assert len({z.zone_id for z in zones}) == len(zones)

    def test_respects_explicit_count_by_cycling(self) -> None:
        zones = generate_zones(_context(), count=3)
        assert len(zones) == 3


class TestGenerateWorkers:
    def test_requires_at_least_one_zone(self) -> None:
        with pytest.raises(ValueError):
            generate_workers(_context(), count=5, zones=[])

    def test_generates_requested_count_with_unique_ids(self) -> None:
        zones = generate_zones(_context())
        workers = generate_workers(_context(), count=10, zones=zones)
        assert len(workers) == 10
        assert len({w.employee_id for w in workers}) == 10

    def test_worker_zones_reference_generated_zones(self) -> None:
        zones = generate_zones(_context())
        zone_ids = {z.zone_id for z in zones}
        workers = generate_workers(_context(), count=20, zones=zones)
        assert all(w.zone_id in zone_ids for w in workers)


class TestGenerateEquipment:
    def test_requires_at_least_one_zone(self) -> None:
        with pytest.raises(ValueError):
            generate_equipment(_context(), count=5, zones=[])

    def test_generates_unique_ids(self) -> None:
        zones = generate_zones(_context())
        equipment = generate_equipment(_context(), count=15, zones=zones)
        assert len(equipment) == 15
        assert len({e.equipment_id for e in equipment}) == 15


class TestGeneratePermits:
    def test_requires_zones_and_equipment(self) -> None:
        with pytest.raises(ValueError):
            generate_permits(_context(), count=5, zones=[], equipment=[])

    def test_permits_reference_valid_zones_and_equipment(self) -> None:
        zones = generate_zones(_context())
        equipment = generate_equipment(_context(), count=10, zones=zones)
        permits = generate_permits(_context(), count=20, zones=zones, equipment=equipment)

        zone_ids = {z.zone_id for z in zones}
        equipment_ids = {e.equipment_id for e in equipment}
        assert all(p.zone_id in zone_ids for p in permits)
        assert all(p.equipment_id in equipment_ids for p in permits)

    def test_end_time_after_start_time(self) -> None:
        zones = generate_zones(_context())
        equipment = generate_equipment(_context(), count=10, zones=zones)
        permits = generate_permits(_context(), count=20, zones=zones, equipment=equipment)
        assert all(p.end_time > p.start_time for p in permits)


class TestGenerateMaintenanceRecords:
    def test_requires_equipment(self) -> None:
        with pytest.raises(ValueError):
            generate_maintenance_records(_context(), count=5, equipment=[])

    def test_records_reference_valid_equipment(self) -> None:
        zones = generate_zones(_context())
        equipment = generate_equipment(_context(), count=10, zones=zones)
        records = generate_maintenance_records(_context(), count=25, equipment=equipment)

        equipment_ids = {e.equipment_id for e in equipment}
        assert all(r.equipment_id in equipment_ids for r in records)

    def test_ongoing_records_have_no_end_time(self) -> None:
        zones = generate_zones(_context())
        equipment = generate_equipment(_context(), count=10, zones=zones)
        records = generate_maintenance_records(_context(), count=50, equipment=equipment)
        ongoing = [r for r in records if r.status == "ongoing"]
        assert ongoing, "expected at least one ongoing record across 50 samples"
        assert all(r.end_time is None for r in ongoing)


class TestGenerateShiftSchedules:
    def test_rejects_non_positive_days(self) -> None:
        zones = generate_zones(_context())
        workers = generate_workers(_context(), count=3, zones=zones)
        with pytest.raises(ValueError):
            generate_shift_schedules(_context(), workers=workers, days_back=0)

    def test_produces_one_row_per_worker_per_day(self) -> None:
        zones = generate_zones(_context())
        workers = generate_workers(_context(), count=5, zones=zones)
        schedules = generate_shift_schedules(_context(), workers=workers, days_back=4)
        assert len(schedules) == 5 * 4

    def test_night_shift_end_time_crosses_midnight(self) -> None:
        zones = generate_zones(_context())
        workers = [w for w in generate_workers(_context(), count=20, zones=zones) if w.shift == "Night"]
        assert workers, "expected at least one Night-shift worker across 20 samples"
        schedules = generate_shift_schedules(_context(), workers=workers[:1], days_back=1)
        schedule = schedules[0]
        assert schedule.end_time > schedule.start_time


class TestGenerateSensorReadings:
    def test_requires_zones(self) -> None:
        with pytest.raises(ValueError):
            generate_sensor_readings(_context(), zones=[])

    def test_generates_seven_kinds_per_zone_per_tick(self) -> None:
        zones = generate_zones(_context(), count=2)
        readings = generate_sensor_readings(_context(), zones=zones, ticks=1)
        assert len(readings) == 2 * 7

    def test_multiple_ticks_multiply_output(self) -> None:
        zones = generate_zones(_context(), count=1)
        readings = generate_sensor_readings(_context(), zones=zones, ticks=3)
        assert len(readings) == 1 * 7 * 3
