"""Sensor reading dataset generator.

Delegates value/threshold generation to
``src.services.sensor_simulator`` rather than reimplementing waveform and
classification logic — this generator's only job is to translate the
zones produced by :func:`~src.services.dataset_generation.generators.zones.generate_zones`
and the shared ``GenerationContext`` into a ``SimulatorConfig``, run one or
more ticks, and adapt the results into ``SensorReadingRecord`` rows.
"""

from __future__ import annotations

from src.services.dataset_generation.context import GenerationContext
from src.services.dataset_generation.entities import SensorReadingRecord, Zone
from src.services.sensor_simulator import (
    SensorSimulatorEngine,
    SensorSimulatorService,
    SimulationMode,
    SimulatorConfig,
)


def generate_sensor_readings(
    context: GenerationContext,
    zones: list[Zone],
    ticks: int = 1,
    interval_seconds: float = 300.0,
    deterministic: bool = False,
) -> list[SensorReadingRecord]:
    """Generate simulated sensor readings for the given zones.

    Args:
        context: Shared generation context — its seed drives RANDOM mode
            so the dataset pipeline's single seed also determines sensor
            output; its ``anchor_time`` becomes the simulator's start time.
        zones: Zones to generate readings for; every sensor kind is
            simulated once per zone per tick.
        ticks: Number of simulation ticks to generate. Use more than 1 to
            produce a short time series instead of a single snapshot.
        interval_seconds: Spacing between ticks.
        deterministic: When ``True``, uses the simulator's DETERMINISTIC
            waveform mode (ignores ``context.seed``) instead of RANDOM
            mode — useful when the caller wants sensor data reproducible
            independent of the shared dataset seed.
    """
    if not zones:
        raise ValueError("generate_sensor_readings requires at least one zone")

    config = SimulatorConfig(
        zones=tuple(zone.zone_id for zone in zones),
        mode=SimulationMode.DETERMINISTIC if deterministic else SimulationMode.RANDOM,
        interval_seconds=interval_seconds,
        seed=context.seed,
    )
    service = SensorSimulatorService(
        SensorSimulatorEngine(config=config, start_time=context.anchor_time)
    )

    records: list[SensorReadingRecord] = []
    for batch in service.generate_run(ticks=ticks):
        for reading in batch:
            records.append(
                SensorReadingRecord(
                    sensor_id=reading.sensor_id,
                    zone_id=reading.zone,
                    kind=reading.kind.value,
                    value=reading.value,
                    unit=reading.unit,
                    status=reading.status.value,
                    timestamp=reading.timestamp,
                )
            )
    return records
