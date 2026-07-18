"""Value generation strategies for the Industrial Sensor Simulator.

Two interchangeable strategies behind the same ``ValueGeneratorPort``
protocol:

- ``DeterministicValueGenerator`` is a pure function of elapsed time (a
  sine waveform around the profile baseline). Same inputs always produce
  the same output, no RNG involved — suitable for reproducible demos and
  golden-file tests.
- ``RandomValueGenerator`` layers Gaussian jitter around the same waveform
  using a ``random.Random`` instance, optionally seeded for a reproducible
  stochastic session.
"""

from __future__ import annotations

import math
import random
from typing import Protocol

from src.services.sensor_simulator.schemas import SensorProfile


class ValueGeneratorPort(Protocol):
    """Contract for producing the next raw reading value for a sensor."""

    def next_value(self, profile: SensorProfile, elapsed_seconds: float) -> float: ...


def _clamp(value: float, profile: SensorProfile) -> float:
    return max(profile.min_value, min(profile.max_value, value))


def _waveform(profile: SensorProfile, elapsed_seconds: float) -> float:
    phase = (2 * math.pi * elapsed_seconds) / profile.period_seconds
    return profile.baseline + profile.amplitude * math.sin(phase)


class DeterministicValueGenerator:
    """Repeatable sine-waveform generator for demo mode."""

    def next_value(self, profile: SensorProfile, elapsed_seconds: float) -> float:
        return round(_clamp(_waveform(profile, elapsed_seconds), profile), 3)


class RandomValueGenerator:
    """Stochastic generator: waveform plus Gaussian noise.

    Args:
        seed: Fixes the underlying RNG so a session can be replayed. When
            ``None``, each generator instance draws from an unseeded
            (non-reproducible) stream.
    """

    def __init__(self, seed: int | None = None) -> None:
        self._random = random.Random(seed)

    def next_value(self, profile: SensorProfile, elapsed_seconds: float) -> float:
        noisy = _waveform(profile, elapsed_seconds) + self._random.gauss(0.0, profile.noise_stddev)
        return round(_clamp(noisy, profile), 3)
