"""Worker dataset generator."""

from __future__ import annotations

from datetime import timedelta

from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.entities import Worker, Zone
from src.services.dataset_generation.reference_data import (
    FIRST_NAMES,
    LAST_NAMES,
    SHIFTS,
    WORKER_PROFILES,
)

_STATUS_CHOICES: list[tuple[str, float]] = [
    ("working", 0.80),
    ("idle", 0.15),
    ("emergency", 0.05),
]


def _weighted_choice(rng, choices: list[tuple[str, float]]) -> str:
    return rng.choices([value for value, _ in choices], weights=[w for _, w in choices], k=1)[0]


def generate_workers(context: GenerationContext, count: int, zones: list[Zone]) -> list[Worker]:
    """Generate plant workers distributed across the given zones.

    Args:
        context: Shared generation context — supplies the RNG so output is
            reproducible when ``context.seed`` is set.
        count: Number of workers to generate.
        zones: Zones to assign workers to (round-robin base assignment,
            perturbed by the RNG so the distribution isn't perfectly even).
    """
    if not zones:
        raise ValueError("generate_workers requires at least one zone")

    rng = context.rng
    workers: list[Worker] = []

    for i in range(count):
        department, role = WORKER_PROFILES[i % len(WORKER_PROFILES)]
        zone = zones[rng.randrange(len(zones))]
        hire_date = context.anchor_time - timedelta(days=rng.randint(30, 3650))

        workers.append(
            Worker(
                employee_id=f"EMP-{i + 1:04d}",
                name=f"{FIRST_NAMES[i % len(FIRST_NAMES)]} {LAST_NAMES[rng.randrange(len(LAST_NAMES))]}",
                department=department,
                role=role,
                zone_id=zone.zone_id,
                shift=SHIFTS[i % len(SHIFTS)],
                status=_weighted_choice(rng, _STATUS_CHOICES),
                ppe_status=rng.random() > 0.15,
                hire_date=hire_date,
            )
        )

    return workers
