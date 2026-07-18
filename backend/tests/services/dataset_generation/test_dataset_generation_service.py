"""Tests for the DatasetGenerationService orchestrator: determinism and referential integrity."""

from __future__ import annotations

from datetime import datetime, timezone

from src.services.dataset_generation.service import DatasetGenerationConfig, DatasetGenerationService

ANCHOR = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _small_config(seed: int | None, anchor_time: datetime | None = None) -> DatasetGenerationConfig:
    return DatasetGenerationConfig(
        worker_count=10,
        equipment_count=8,
        permit_count=12,
        maintenance_count=15,
        shift_schedule_days=3,
        sensor_ticks=1,
        seed=seed,
        anchor_time=anchor_time,
    )


class TestDeterminism:
    def test_same_seed_and_anchor_produce_identical_dataset(self) -> None:
        service = DatasetGenerationService()
        dataset_a = service.generate(_small_config(seed=7, anchor_time=ANCHOR))
        dataset_b = service.generate(_small_config(seed=7, anchor_time=ANCHOR))

        assert [w.as_dict() for w in dataset_a.workers] == [w.as_dict() for w in dataset_b.workers]
        assert [p.as_dict() for p in dataset_a.permits] == [p.as_dict() for p in dataset_b.permits]
        assert [s.as_dict() for s in dataset_a.sensor_readings] == [
            s.as_dict() for s in dataset_b.sensor_readings
        ]

    def test_different_seeds_diverge(self) -> None:
        service = DatasetGenerationService()
        dataset_a = service.generate(_small_config(seed=1, anchor_time=ANCHOR))
        dataset_b = service.generate(_small_config(seed=2, anchor_time=ANCHOR))

        assert [w.as_dict() for w in dataset_a.workers] != [w.as_dict() for w in dataset_b.workers]

    def test_unpinned_anchor_time_breaks_reproducibility_even_with_same_seed(self) -> None:
        """Documents the contract: seed alone is not enough for byte-identical
        output, since time-relative fields (hire_date, sensor timestamps) are
        computed from ``anchor_time``, which defaults to wall-clock now."""
        service = DatasetGenerationService()
        dataset_a = service.generate(_small_config(seed=7))
        dataset_b = service.generate(_small_config(seed=7))

        assert [w.employee_id for w in dataset_a.workers] == [w.employee_id for w in dataset_b.workers]
        assert [w.hire_date for w in dataset_a.workers] != [w.hire_date for w in dataset_b.workers]

    def test_unseeded_runs_are_not_required_to_match(self) -> None:
        service = DatasetGenerationService()
        dataset_a = service.generate(_small_config(seed=None))
        dataset_b = service.generate(_small_config(seed=None))
        # Not asserting inequality (a random collision is possible but
        # astronomically unlikely for 10 workers) — this test documents
        # that unseeded mode does NOT promise reproducibility, unlike
        # the seeded case above.
        assert isinstance(dataset_a.workers, list)
        assert isinstance(dataset_b.workers, list)


class TestReferentialIntegrity:
    def test_all_cross_references_resolve(self) -> None:
        service = DatasetGenerationService()
        dataset = service.generate(_small_config(seed=99, anchor_time=ANCHOR))

        zone_ids = {z.zone_id for z in dataset.zones}
        equipment_ids = {e.equipment_id for e in dataset.equipment}
        employee_ids = {w.employee_id for w in dataset.workers}

        assert all(w.zone_id in zone_ids for w in dataset.workers)
        assert all(e.zone_id in zone_ids for e in dataset.equipment)
        assert all(p.zone_id in zone_ids and p.equipment_id in equipment_ids for p in dataset.permits)
        assert all(m.equipment_id in equipment_ids for m in dataset.maintenance_records)
        assert all(
            s.employee_id in employee_ids and s.zone_id in zone_ids for s in dataset.shift_schedules
        )
        assert all(r.zone_id in zone_ids for r in dataset.sensor_readings)

    def test_as_named_collections_covers_all_seven_entities(self) -> None:
        service = DatasetGenerationService()
        dataset = service.generate(_small_config(seed=3, anchor_time=ANCHOR))
        collections = dataset.as_named_collections()

        assert set(collections.keys()) == {
            "zones",
            "workers",
            "equipment",
            "permits",
            "maintenance_records",
            "shift_schedules",
            "sensor_readings",
        }
        assert all(len(records) > 0 for records in collections.values())
