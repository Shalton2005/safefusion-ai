"""Simulation engine: turns configuration + generators into sensor readings.

Pure and framework-agnostic — no asyncio, no HTTP, no DB. A single call to
``tick()`` produces one ``SensorReading`` per configured (zone, kind) pair
for a given point in simulated time. Scheduling repeated ticks on an
interval is the concern of ``SensorSimulatorService``, not this module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from src.services.sensor_simulator.generators import (
    DeterministicValueGenerator,
    RandomValueGenerator,
    ValueGeneratorPort,
)
from src.services.sensor_simulator.profiles import DEFAULT_SENSOR_PROFILES
from src.services.sensor_simulator.schemas import (
    SensorKind,
    SensorProfile,
    SensorReading,
    SimulationMode,
    SimulatorConfig,
)


def _build_generator(mode: SimulationMode, seed: int | None) -> ValueGeneratorPort:
    if mode is SimulationMode.DETERMINISTIC:
        return DeterministicValueGenerator()
    return RandomValueGenerator(seed=seed)


@dataclass
class SensorSimulatorEngine:
    """Generates one batch of readings per tick for every configured sensor.

    Args:
        config: Zones/kinds/mode/interval to simulate.
        profiles: Per-kind generation parameters. Defaults to
            ``DEFAULT_SENSOR_PROFILES``; pass a subset/override for
            site-specific tuning without touching the module defaults.
        generator: Overrides the value-generation strategy derived from
            ``config.mode``. Mainly for tests that need a deterministic
            stub in RANDOM mode.
        start_time: Wall-clock instant treated as elapsed_seconds == 0.
            Defaults to construction time; pass an explicit value for
            reproducible tests.
    """

    config: SimulatorConfig
    profiles: dict[SensorKind, SensorProfile] = field(
        default_factory=lambda: dict(DEFAULT_SENSOR_PROFILES)
    )
    generator: ValueGeneratorPort | None = None
    start_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        if self.generator is None:
            self.generator = _build_generator(self.config.mode, self.config.seed)

    def tick(self, at: datetime | None = None) -> list[SensorReading]:
        """Generate one reading per (zone, kind) pair for the given instant.

        Args:
            at: Point in time to simulate. Defaults to now. Must be
                timezone-aware if provided, to match ``start_time``.
        """
        now = at or datetime.now(timezone.utc)
        elapsed_seconds = (now - self.start_time).total_seconds()

        readings: list[SensorReading] = []
        for zone in self.config.zones:
            for kind in self.config.kinds:
                profile = self.profiles.get(kind)
                if profile is None:
                    continue
                value = self.generator.next_value(profile, elapsed_seconds)
                readings.append(
                    SensorReading(
                        sensor_id=f"{zone}:{kind.value}",
                        zone=zone,
                        kind=kind,
                        value=value,
                        unit=profile.unit,
                        status=profile.thresholds.classify(value),
                        timestamp=now,
                    )
                )
        return readings
