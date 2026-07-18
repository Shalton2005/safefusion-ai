"""Equipment dataset generator."""

from __future__ import annotations

from datetime import timedelta

from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.entities import Equipment, Zone
from src.services.dataset_generation.reference_data import (
    EQUIPMENT_CATEGORIES,
    EQUIPMENT_CRITICALITY,
    EQUIPMENT_MANUFACTURERS,
)


def generate_equipment(context: GenerationContext, count: int, zones: list[Zone]) -> list[Equipment]:
    """Generate plant equipment assigned to the given zones.

    Args:
        context: Shared generation context.
        count: Number of equipment records to generate.
        zones: Zones to assign equipment to.
    """
    if not zones:
        raise ValueError("generate_equipment requires at least one zone")

    rng = context.rng
    equipment: list[Equipment] = []

    for i in range(count):
        zone = zones[i % len(zones)]
        category = EQUIPMENT_CATEGORIES[rng.randrange(len(EQUIPMENT_CATEGORIES))]
        zone_code = "".join(part[0] for part in zone.zone_id.replace("-", " ").split()).upper()

        equipment.append(
            Equipment(
                equipment_id=f"EQ-{zone_code}-{i + 1:03d}",
                name=f"{category} Unit {i + 1}",
                category=category,
                zone_id=zone.zone_id,
                manufacturer=EQUIPMENT_MANUFACTURERS[rng.randrange(len(EQUIPMENT_MANUFACTURERS))],
                install_date=context.anchor_time - timedelta(days=rng.randint(90, 7300)),
                criticality=EQUIPMENT_CRITICALITY[rng.randrange(len(EQUIPMENT_CRITICALITY))],
            )
        )

    return equipment
