"""Industrial Sensor Simulator package for SafeFusion AI.

Generates realistic telemetry for seven industrial sensor kinds (methane,
carbon monoxide, hydrogen sulfide, temperature, pressure, humidity,
vibration) in either a deterministic demo mode (repeatable waveform, no
RNG) or a random simulation mode (waveform plus seeded Gaussian noise).
Each reading is classified against configurable warning/critical
thresholds.

Framework-agnostic by design: nothing here imports FastAPI, SQLAlchemy, or
any transport concern. A route module wires ``SensorSimulatorService`` into
an endpoint the same way ``src.routes.sensors`` wires up
``SensorMonitoringService`` — construct it, call it, serialize the result.
"""

from src.services.sensor_simulator.engine import SensorSimulatorEngine
from src.services.sensor_simulator.generators import (
    DeterministicValueGenerator,
    RandomValueGenerator,
    ValueGeneratorPort,
)
from src.services.sensor_simulator.profiles import DEFAULT_SENSOR_PROFILES
from src.services.sensor_simulator.schemas import (
    ReadingStatus,
    SensorKind,
    SensorProfile,
    SensorReading,
    SimulationMode,
    SimulatorConfig,
    ThresholdBand,
)
from src.services.sensor_simulator.service import SensorSimulatorService

__all__ = [
    "SensorSimulatorEngine",
    "SensorSimulatorService",
    "DeterministicValueGenerator",
    "RandomValueGenerator",
    "ValueGeneratorPort",
    "DEFAULT_SENSOR_PROFILES",
    "ReadingStatus",
    "SensorKind",
    "SensorProfile",
    "SensorReading",
    "SimulationMode",
    "SimulatorConfig",
    "ThresholdBand",
]
