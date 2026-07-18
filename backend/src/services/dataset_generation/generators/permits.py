"""Permit-to-Work dataset generator.

Uses ``src.models.enums.PermitType``/``PermitStatus`` for the type/status
vocabulary (unlike ``Equipment``/``ShiftSchedule``, permits already have a
stable ORM-backed enum in this codebase, so there's no reason to duplicate
it) but still emits the standalone ``Permit`` dataclass, not the ORM model.
"""

from __future__ import annotations

from datetime import timedelta

from src.models.enums import PermitStatus, PermitType
from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.entities import Equipment, Permit, Zone
from src.services.dataset_generation.reference_data import SAFETY_OFFICERS, TEAMS

_STATUS_CHOICES: list[tuple[PermitStatus, float]] = [
    (PermitStatus.ACTIVE, 0.60),
    (PermitStatus.CLOSED, 0.30),
    (PermitStatus.SUSPENDED, 0.10),
]


def generate_permits(
    context: GenerationContext,
    count: int,
    zones: list[Zone],
    equipment: list[Equipment],
) -> list[Permit]:
    """Generate Permit-to-Work records tied to zones and equipment.

    Args:
        context: Shared generation context.
        count: Number of permits to generate.
        zones: Zones a permit may cover.
        equipment: Equipment a permit may cover work on.
    """
    if not zones:
        raise ValueError("generate_permits requires at least one zone")
    if not equipment:
        raise ValueError("generate_permits requires at least one equipment record")

    rng = context.rng
    permit_types = list(PermitType)
    permits: list[Permit] = []

    for i in range(count):
        zone = zones[rng.randrange(len(zones))]
        zone_equipment = [item for item in equipment if item.zone_id == zone.zone_id] or equipment
        equipment_item = zone_equipment[rng.randrange(len(zone_equipment))]

        start_time = context.anchor_time - timedelta(hours=rng.randint(1, 240))
        duration_hours = 8 if permit_types[i % len(permit_types)] == PermitType.CONFINED_SPACE else 6
        end_time = start_time + timedelta(hours=duration_hours)
        status = rng.choices(
            [value for value, _ in _STATUS_CHOICES], weights=[w for _, w in _STATUS_CHOICES], k=1
        )[0]

        permits.append(
            Permit(
                permit_id=f"PTW-{i + 1:05d}",
                permit_type=permit_types[i % len(permit_types)].value,
                zone_id=zone.zone_id,
                equipment_id=equipment_item.equipment_id,
                issued_by=SAFETY_OFFICERS[rng.randrange(len(SAFETY_OFFICERS))],
                assigned_team=TEAMS[rng.randrange(len(TEAMS))],
                start_time=start_time,
                end_time=end_time,
                status=status.value,
            )
        )

    return permits
