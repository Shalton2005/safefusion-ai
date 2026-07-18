"""Maintenance record dataset generator."""

from __future__ import annotations

from datetime import timedelta

from src.models.enums import MaintenanceStatus, MaintenanceType
from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.entities import Equipment, MaintenanceRecord
from src.services.dataset_generation.reference_data import TEAMS

_TYPE_CHOICES: list[tuple[MaintenanceType, float]] = [
    (MaintenanceType.PREVENTIVE, 0.70),
    (MaintenanceType.CORRECTIVE, 0.30),
]

_STATUS_CHOICES: list[tuple[MaintenanceStatus, float]] = [
    (MaintenanceStatus.COMPLETED, 0.55),
    (MaintenanceStatus.PLANNED, 0.30),
    (MaintenanceStatus.ONGOING, 0.15),
]


def _weighted_pick(rng, choices):
    return rng.choices([value for value, _ in choices], weights=[w for _, w in choices], k=1)[0]


def generate_maintenance_records(
    context: GenerationContext, count: int, equipment: list[Equipment]
) -> list[MaintenanceRecord]:
    """Generate maintenance activity records for the given equipment.

    Args:
        context: Shared generation context.
        count: Number of maintenance records to generate.
        equipment: Equipment records maintenance is performed on.
    """
    if not equipment:
        raise ValueError("generate_maintenance_records requires at least one equipment record")

    rng = context.rng
    records: list[MaintenanceRecord] = []

    for i in range(count):
        item = equipment[i % len(equipment)]
        status = _weighted_pick(rng, _STATUS_CHOICES)
        start_time = context.anchor_time - timedelta(hours=rng.randint(1, 720))
        end_time = None if status == MaintenanceStatus.ONGOING else start_time + timedelta(
            hours=rng.randint(1, 12)
        )

        records.append(
            MaintenanceRecord(
                record_id=f"MNT-{i + 1:05d}",
                equipment_id=item.equipment_id,
                maintenance_type=_weighted_pick(rng, _TYPE_CHOICES).value,
                assigned_team=TEAMS[rng.randrange(len(TEAMS))],
                status=status.value,
                start_time=start_time,
                end_time=end_time,
            )
        )

    return records
