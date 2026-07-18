"""Shift schedule dataset generator.

Produces one schedule row per (worker, day) pair covering
``days_back`` days ending at ``context.anchor_time``'s date, using each
worker's assigned shift from :func:`generate_workers` as the recurring
pattern — this models a fixed shift roster rather than a randomized one,
matching how plant shift rotations are typically published in advance.
"""

from __future__ import annotations

from datetime import timedelta

from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.entities import ShiftSchedule, Worker
from src.services.dataset_generation.reference_data import SHIFT_HOURS


def generate_shift_schedules(
    context: GenerationContext, workers: list[Worker], days_back: int = 7
) -> list[ShiftSchedule]:
    """Generate a shift schedule roster for the given workers.

    Args:
        context: Shared generation context.
        workers: Workers to generate a schedule row for, one per day.
        days_back: Number of days (including today) the roster covers,
            counting back from ``context.anchor_time``'s date.
    """
    if days_back < 1:
        raise ValueError("days_back must be >= 1")

    anchor_date = context.anchor_time.replace(hour=0, minute=0, second=0, microsecond=0)
    schedules: list[ShiftSchedule] = []
    counter = 1

    for day_offset in range(days_back):
        shift_date = anchor_date - timedelta(days=days_back - 1 - day_offset)
        for worker in workers:
            start_hour, end_hour = SHIFT_HOURS[worker.shift]
            start_time = shift_date + timedelta(hours=start_hour)
            end_time = shift_date + timedelta(hours=end_hour)
            if end_hour <= start_hour:
                end_time += timedelta(days=1)

            schedules.append(
                ShiftSchedule(
                    schedule_id=f"SHF-{counter:06d}",
                    employee_id=worker.employee_id,
                    zone_id=worker.zone_id,
                    shift=worker.shift,
                    shift_date=shift_date,
                    start_time=start_time,
                    end_time=end_time,
                )
            )
            counter += 1

    return schedules
