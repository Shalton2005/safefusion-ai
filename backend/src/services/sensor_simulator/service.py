"""Reusable service facade for the Industrial Sensor Simulator.

Deliberately transport-agnostic: no FastAPI, no WebSocket, no DB session.
Callers (a REST route, a WebSocket route, a CLI script, a background
worker, a test) each decide how to consume ``generate_batch`` / ``stream``.
This mirrors the pattern used by ``src.services.compound_risk`` and
``src.services.sensor_monitoring`` — the service owns orchestration, the
engine owns computation, and neither knows how it will be invoked.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import datetime, timedelta

from src.services.sensor_simulator.engine import SensorSimulatorEngine
from src.services.sensor_simulator.schemas import SensorReading, SimulatorConfig


class SensorSimulatorService:
    """Orchestrates the simulation engine for single reads or continuous streams."""

    def __init__(self, engine: SensorSimulatorEngine) -> None:
        self._engine = engine

    @property
    def config(self) -> SimulatorConfig:
        return self._engine.config

    def generate_batch(self, at: datetime | None = None) -> list[SensorReading]:
        """Produce one batch of readings (one per configured zone/kind pair)."""
        return self._engine.tick(at=at)

    def generate_run(self, ticks: int) -> list[list[SensorReading]]:
        """Produce ``ticks`` sequential batches, spaced by the configured interval.

        Useful for backfilling a demo dataset or for tests that assert on a
        finite sequence without waiting on a real clock.
        """
        if ticks < 1:
            raise ValueError("ticks must be >= 1")

        batches: list[list[SensorReading]] = []
        base_time = self._engine.start_time
        interval = self.config.interval_seconds
        for i in range(ticks):
            at = base_time + timedelta(seconds=i * interval)
            batches.append(self._engine.tick(at=at))
        return batches

    async def stream(self) -> AsyncIterator[list[SensorReading]]:
        """Yield a new batch of readings every ``config.interval_seconds``.

        Runs indefinitely until the consumer stops iterating (e.g. breaks
        out of an ``async for`` loop or the task is cancelled) — callers
        that need a bounded run should use ``generate_run`` instead.
        """
        while True:
            yield self._engine.tick()
            await asyncio.sleep(self.config.interval_seconds)
