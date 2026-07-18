"""Tests for the Industrial Sensor Simulator engine and generators."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from src.services.sensor_simulator.engine import SensorSimulatorEngine
from src.services.sensor_simulator.generators import (
    DeterministicValueGenerator,
    RandomValueGenerator,
)
from src.services.sensor_simulator.profiles import DEFAULT_SENSOR_PROFILES
from src.services.sensor_simulator.schemas import (
    ReadingStatus,
    SensorKind,
    SensorProfile,
    SimulationMode,
    SimulatorConfig,
    ThresholdBand,
)

START = datetime(2026, 1, 1, tzinfo=timezone.utc)


class TestDeterministicMode:
    def test_same_instant_produces_identical_values(self) -> None:
        config = SimulatorConfig(
            zones=("Zone-A",), kinds=(SensorKind.TEMPERATURE,), mode=SimulationMode.DETERMINISTIC
        )
        engine_a = SensorSimulatorEngine(config=config, start_time=START)
        engine_b = SensorSimulatorEngine(config=config, start_time=START)

        at = START + timedelta(seconds=120)
        readings_a = engine_a.tick(at=at)
        readings_b = engine_b.tick(at=at)

        assert readings_a[0].value == readings_b[0].value

    def test_values_stay_within_profile_bounds(self) -> None:
        config = SimulatorConfig(
            zones=("Zone-A",), kinds=tuple(SensorKind), mode=SimulationMode.DETERMINISTIC
        )
        engine = SensorSimulatorEngine(config=config, start_time=START)

        for step in range(0, 3600, 30):
            for reading in engine.tick(at=START + timedelta(seconds=step)):
                profile = DEFAULT_SENSOR_PROFILES[reading.kind]
                assert profile.min_value <= reading.value <= profile.max_value

    def test_generator_used_directly_is_pure(self) -> None:
        generator = DeterministicValueGenerator()
        profile = DEFAULT_SENSOR_PROFILES[SensorKind.PRESSURE]
        assert generator.next_value(profile, 42.0) == generator.next_value(profile, 42.0)


class TestRandomMode:
    def test_same_seed_produces_identical_stream(self) -> None:
        config = SimulatorConfig(
            zones=("Zone-A",),
            kinds=(SensorKind.METHANE,),
            mode=SimulationMode.RANDOM,
            seed=123,
        )
        engine_a = SensorSimulatorEngine(config=config, start_time=START)
        engine_b = SensorSimulatorEngine(config=config, start_time=START)

        values_a = [engine_a.tick(at=START + timedelta(seconds=i * 5))[0].value for i in range(5)]
        values_b = [engine_b.tick(at=START + timedelta(seconds=i * 5))[0].value for i in range(5)]

        assert values_a == values_b

    def test_different_seeds_diverge(self) -> None:
        profile = DEFAULT_SENSOR_PROFILES[SensorKind.HUMIDITY]
        gen_a = RandomValueGenerator(seed=1)
        gen_b = RandomValueGenerator(seed=2)

        values_a = [gen_a.next_value(profile, t) for t in range(0, 50, 5)]
        values_b = [gen_b.next_value(profile, t) for t in range(0, 50, 5)]

        assert values_a != values_b

    def test_random_values_stay_within_profile_bounds(self) -> None:
        config = SimulatorConfig(
            zones=("Zone-A",), kinds=tuple(SensorKind), mode=SimulationMode.RANDOM, seed=7
        )
        engine = SensorSimulatorEngine(config=config, start_time=START)

        for step in range(0, 600, 5):
            for reading in engine.tick(at=START + timedelta(seconds=step)):
                profile = DEFAULT_SENSOR_PROFILES[reading.kind]
                assert profile.min_value <= reading.value <= profile.max_value


class TestThresholdClassification:
    def test_classifies_normal_warning_critical(self) -> None:
        band = ThresholdBand(warning_max=10.0, critical_max=20.0)
        assert band.classify(5.0) is ReadingStatus.NORMAL
        assert band.classify(10.0) is ReadingStatus.WARNING
        assert band.classify(20.0) is ReadingStatus.CRITICAL

    def test_classifies_using_min_bounds(self) -> None:
        band = ThresholdBand(warning_min=5.0, critical_min=0.0)
        assert band.classify(10.0) is ReadingStatus.NORMAL
        assert band.classify(5.0) is ReadingStatus.WARNING
        assert band.classify(0.0) is ReadingStatus.CRITICAL

    def test_engine_tags_readings_with_computed_status(self) -> None:
        profile = SensorProfile(
            kind=SensorKind.VIBRATION,
            unit="mm/s",
            baseline=10.0,
            amplitude=0.0,
            noise_stddev=0.0,
            min_value=0.0,
            max_value=20.0,
            thresholds=ThresholdBand(warning_max=5.0, critical_max=8.0),
        )
        config = SimulatorConfig(
            zones=("Zone-A",), kinds=(SensorKind.VIBRATION,), mode=SimulationMode.DETERMINISTIC
        )
        engine = SensorSimulatorEngine(
            config=config, profiles={SensorKind.VIBRATION: profile}, start_time=START
        )

        reading = engine.tick(at=START)[0]
        assert reading.value == 10.0
        assert reading.status is ReadingStatus.CRITICAL


class TestBatchGeneration:
    def test_produces_one_reading_per_zone_kind_pair(self) -> None:
        config = SimulatorConfig(
            zones=("Zone-A", "Zone-B"),
            kinds=(SensorKind.TEMPERATURE, SensorKind.PRESSURE),
            mode=SimulationMode.DETERMINISTIC,
        )
        engine = SensorSimulatorEngine(config=config, start_time=START)

        readings = engine.tick(at=START)
        assert len(readings) == 4
        assert {(r.zone, r.kind) for r in readings} == {
            ("Zone-A", SensorKind.TEMPERATURE),
            ("Zone-A", SensorKind.PRESSURE),
            ("Zone-B", SensorKind.TEMPERATURE),
            ("Zone-B", SensorKind.PRESSURE),
        }

    def test_sensor_id_is_stable_and_unique(self) -> None:
        config = SimulatorConfig(
            zones=("Zone-A",), kinds=(SensorKind.HYDROGEN_SULFIDE,), mode=SimulationMode.DETERMINISTIC
        )
        engine = SensorSimulatorEngine(config=config, start_time=START)
        reading = engine.tick(at=START)[0]
        assert reading.sensor_id == "Zone-A:hydrogen_sulfide"

    def test_default_kinds_cover_all_seven_sensors(self) -> None:
        config = SimulatorConfig(zones=("Zone-A",), mode=SimulationMode.DETERMINISTIC)
        engine = SensorSimulatorEngine(config=config, start_time=START)
        readings = engine.tick(at=START)
        assert {r.kind for r in readings} == set(SensorKind)
