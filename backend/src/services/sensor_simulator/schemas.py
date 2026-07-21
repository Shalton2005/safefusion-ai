"""Dataclasses and enums shared by the Industrial Sensor Simulator.

Deliberately independent of ``src.models.enums.SensorType`` — that enum
tracks what can be *persisted* (constrained by a DB CHECK constraint), while
``SensorKind`` here tracks what the simulator can *generate*. A caller that
wants to store a simulated reading maps ``SensorKind`` to ``SensorType``
itself (e.g. METHANE/CARBON_MONOXIDE/HYDROGEN_SULFIDE all persist as the
generic ``SensorType.GAS`` bucket); the simulator has no opinion on that.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class SensorKind(str, Enum):
    """Specific industrial sensor kinds the simulator can generate."""

    METHANE = "methane"
    CARBON_MONOXIDE = "carbon_monoxide"
    HYDROGEN_SULFIDE = "hydrogen_sulfide"
    TEMPERATURE = "temperature"
    PRESSURE = "pressure"
    HUMIDITY = "humidity"
    VIBRATION = "vibration"


class SimulationMode(str, Enum):
    """How the simulator advances a sensor's value on each tick."""

    DETERMINISTIC = "deterministic"
    RANDOM = "random"


class ReadingStatus(str, Enum):
    """Threshold-classified severity of a single reading."""

    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass(frozen=True)
class ThresholdBand:
    """Warning/critical bounds for one sensor kind.

    A value is critical if it crosses any critical bound, warning if it
    crosses any warning bound, normal otherwise. Mirrors the shape of
    ``src.services.sensor_monitoring.SensorThresholdBand`` so the two stay
    easy to reconcile, without importing it and coupling the two modules.
    """

    warning_min: float | None = None
    warning_max: float | None = None
    critical_min: float | None = None
    critical_max: float | None = None

    def classify(self, value: float) -> ReadingStatus:
        if (self.critical_min is not None and value <= self.critical_min) or (
            self.critical_max is not None and value >= self.critical_max
        ):
            return ReadingStatus.CRITICAL
        if (self.warning_min is not None and value <= self.warning_min) or (
            self.warning_max is not None and value >= self.warning_max
        ):
            return ReadingStatus.WARNING
        return ReadingStatus.NORMAL


@dataclass(frozen=True)
class SensorProfile:
    """Static generation parameters for one sensor kind.

    ``baseline`` and ``amplitude`` drive the deterministic waveform;
    ``noise_stddev`` drives random-mode jitter (and light noise layered on
    top of the deterministic waveform, when enabled). ``min_value``/
    ``max_value`` clamp generated readings to a physically plausible range.
    """

    kind: SensorKind
    unit: str
    baseline: float
    amplitude: float
    noise_stddev: float
    min_value: float
    max_value: float
    thresholds: ThresholdBand
    period_seconds: float = 300.0

    def __post_init__(self) -> None:
        if self.period_seconds <= 0:
            raise ValueError(
                f"SensorProfile.period_seconds must be > 0, got {self.period_seconds!r} "
                f"(used as a waveform-phase divisor; zero or negative causes a "
                f"ZeroDivisionError or an undefined waveform on every tick)."
            )


@dataclass(frozen=True)
class SensorReading:
    """A single simulated telemetry point for one sensor."""

    sensor_id: str
    zone: str
    kind: SensorKind
    value: float
    unit: str
    status: ReadingStatus
    timestamp: datetime


@dataclass(frozen=True)
class SimulatorConfig:
    """Runtime configuration for a simulation session.

    Attributes:
        zones: Plant zones to generate readings for. Every configured
            sensor kind is simulated once per zone on each tick.
        kinds: Sensor kinds to simulate. Defaults to all seven when omitted.
        mode: DETERMINISTIC for repeatable demo output, RANDOM for
            stochastic simulation.
        interval_seconds: Delay between ticks when run via
            ``SensorSimulatorService.stream``/``run_forever``.
        seed: Random seed. In RANDOM mode, fixes the stream so a session is
            reproducible; in DETERMINISTIC mode it is unused since the
            waveform is already a pure function of elapsed time.
    """

    zones: tuple[str, ...] = ("Distillation-Unit",)
    kinds: tuple[SensorKind, ...] = tuple(SensorKind)
    mode: SimulationMode = SimulationMode.RANDOM
    interval_seconds: float = 5.0
    seed: int | None = None
