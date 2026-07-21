"""Industrial Sensor Simulator routes for SafeFusion AI API v1.

Thin HTTP wrapper around ``src.services.sensor_simulator`` — this module
owns request parsing and response serialization only. All generation logic
lives in the service/engine, which have no FastAPI dependency and can be
reused from a script, a WebSocket route, or a test without going through
HTTP at all.
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Query

from src.schemas.response.sensor_simulator import SimulatedBatchResponse
from src.services.sensor_simulator import (
    SensorKind,
    SensorSimulatorEngine,
    SensorSimulatorService,
    SimulationMode,
    SimulatorConfig,
)

router: APIRouter = APIRouter(prefix="/sensor-simulator", tags=["Sensor Simulator"])


def get_sensor_simulator_service(
    zones: list[str],
    kinds: tuple[SensorKind, ...],
    mode: SimulationMode,
    interval_seconds: float,
    seed: int | None,
) -> SensorSimulatorService:
    """Construct a service instance for one request's configuration.

    Each request builds its own engine/config rather than sharing a
    process-wide simulator instance, keeping the HTTP layer stateless —
    a long-running simulation session is the caller's responsibility
    (e.g. via ``SensorSimulatorService.stream`` from a script or a
    WebSocket route), not something this REST endpoint holds open.
    """
    config = SimulatorConfig(
        zones=tuple(zones),
        kinds=kinds,
        mode=mode,
        interval_seconds=interval_seconds,
        seed=seed,
    )
    return SensorSimulatorService(SensorSimulatorEngine(config=config))


@router.get(
    "/reading",
    summary="Generate a simulated sensor reading batch",
    description=(
        "Generates one simulated telemetry batch (one reading per configured "
        "zone/sensor-kind pair) using either deterministic demo mode or random "
        "simulation mode, classified against warning/critical thresholds."
    ),
    response_model=SimulatedBatchResponse,
    response_description="One simulated batch of sensor readings.",
)
def get_simulated_reading(
    zone: Annotated[
        list[str],
        Query(description="Plant zone(s) to simulate. Repeat the parameter for multiple zones."),
    ] = ["Distillation-Unit"],
    kind: Annotated[
        list[SensorKind] | None,
        Query(description="Sensor kind(s) to simulate. Defaults to all seven when omitted."),
    ] = None,
    mode: Annotated[
        SimulationMode,
        Query(description="DETERMINISTIC for repeatable demo output, RANDOM for stochastic simulation."),
    ] = SimulationMode.RANDOM,
    seed: Annotated[
        int | None,
        Query(description="Random seed for reproducible RANDOM-mode output. Ignored in DETERMINISTIC mode."),
    ] = None,
) -> SimulatedBatchResponse:
    kinds = tuple(kind) if kind else tuple(SensorKind)
    service = get_sensor_simulator_service(
        zones=zone,
        kinds=kinds,
        mode=mode,
        interval_seconds=5.0,
        seed=seed,
    )
    readings = service.generate_batch()
    return SimulatedBatchResponse(generated_at=datetime.now(timezone.utc), readings=readings)
