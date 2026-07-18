"""Zone dataset generator.

Zones are the foundational entity: every other generator assigns its
records into a zone drawn from this list, so zone generation always runs
first and has no dependency on any other generator's output.
"""

from __future__ import annotations

from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.entities import Zone
from src.services.dataset_generation.reference_data import ZONE_CATALOG


def generate_zones(context: GenerationContext, count: int | None = None) -> list[Zone]:
    """Generate plant zones.

    Args:
        context: Shared generation context (unused for randomness here
            since the zone catalog is a fixed, named list of real plant
            areas rather than something meaningfully randomizable — kept
            as a parameter for interface consistency with the other
            generators and so a future randomized catalog can use it).
        count: Number of zones to generate, cycling through
            ``ZONE_CATALOG`` if greater than its length. Defaults to the
            full catalog.
    """
    del context  # interface consistency; zone catalog is deterministic by nature
    if count is None:
        count = len(ZONE_CATALOG)

    zones: list[Zone] = []
    for i in range(count):
        zone_id, name, building, hazard_category, is_restricted = ZONE_CATALOG[i % len(ZONE_CATALOG)]
        zones.append(
            Zone(
                zone_id=zone_id,
                name=name,
                building=building,
                hazard_category=hazard_category,
                is_restricted=is_restricted,
            )
        )
    return zones
