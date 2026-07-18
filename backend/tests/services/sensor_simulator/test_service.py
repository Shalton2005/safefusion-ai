"""Tests for the SensorSimulatorService facade."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest

from src.services.sensor_simulator.engine import SensorSimulatorEngine
from src.services.sensor_simulator.schemas import SensorKind, SimulationMode, SimulatorConfig
from src.services.sensor_simulator.service import SensorSimulatorService

START = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _service(**overrides: object) -> SensorSimulatorService:
    params: dict[str, object] = {
        "zones": ("Zone-A",),
        "kinds": (SensorKind.TEMPERATURE,),
        "mode": SimulationMode.DETERMINISTIC,
        "interval_seconds": 1.0,
    }
    params.update(overrides)
    config = SimulatorConfig(**params)
    return SensorSimulatorService(SensorSimulatorEngine(config=config, start_time=START))


class TestGenerateBatch:
    def test_returns_readings_for_configured_sensors(self) -> None:
        service = _service()
        readings = service.generate_batch(at=START)
        assert len(readings) == 1
        assert readings[0].zone == "Zone-A"


class TestGenerateRun:
    def test_produces_requested_number_of_batches(self) -> None:
        service = _service()
        batches = service.generate_run(ticks=4)
        assert len(batches) == 4
        assert all(len(batch) == 1 for batch in batches)

    def test_batches_are_spaced_by_configured_interval(self) -> None:
        service = _service(interval_seconds=10.0)
        batches = service.generate_run(ticks=3)
        timestamps = [batch[0].timestamp for batch in batches]
        assert (timestamps[1] - timestamps[0]).total_seconds() == 10.0
        assert (timestamps[2] - timestamps[1]).total_seconds() == 10.0

    def test_rejects_non_positive_ticks(self) -> None:
        service = _service()
        with pytest.raises(ValueError):
            service.generate_run(ticks=0)


class TestStream:
    def test_stream_yields_batches_until_stopped(self) -> None:
        async def _collect() -> list[list]:
            service = _service(interval_seconds=0.01)
            collected = []
            async for batch in service.stream():
                collected.append(batch)
                if len(collected) == 3:
                    break
            return collected

        collected = asyncio.run(_collect())
        assert len(collected) == 3
