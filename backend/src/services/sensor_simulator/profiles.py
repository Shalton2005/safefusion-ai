"""Default sensor profiles for the Industrial Sensor Simulator.

Baselines/amplitudes are illustrative demo values, not calibrated
instrument specs. Override via ``SensorSimulatorEngine(profiles=...)`` for
site-specific tuning; nothing else in the package hardcodes these.
"""

from __future__ import annotations

from src.services.sensor_simulator.schemas import SensorKind, SensorProfile, ThresholdBand

DEFAULT_SENSOR_PROFILES: dict[SensorKind, SensorProfile] = {
    SensorKind.METHANE: SensorProfile(
        kind=SensorKind.METHANE,
        unit="%LEL",
        baseline=15.0,
        amplitude=8.0,
        noise_stddev=2.0,
        min_value=0.0,
        max_value=100.0,
        thresholds=ThresholdBand(warning_max=40.0, critical_max=60.0),
        period_seconds=300.0,
    ),
    SensorKind.CARBON_MONOXIDE: SensorProfile(
        kind=SensorKind.CARBON_MONOXIDE,
        unit="ppm",
        baseline=15.0,
        amplitude=10.0,
        noise_stddev=3.0,
        min_value=0.0,
        max_value=500.0,
        thresholds=ThresholdBand(warning_max=35.0, critical_max=100.0),
        period_seconds=240.0,
    ),
    SensorKind.HYDROGEN_SULFIDE: SensorProfile(
        kind=SensorKind.HYDROGEN_SULFIDE,
        unit="ppm",
        baseline=3.0,
        amplitude=2.5,
        noise_stddev=0.8,
        min_value=0.0,
        max_value=100.0,
        thresholds=ThresholdBand(warning_max=10.0, critical_max=20.0),
        period_seconds=360.0,
    ),
    SensorKind.TEMPERATURE: SensorProfile(
        kind=SensorKind.TEMPERATURE,
        unit="°C",
        baseline=28.0,
        amplitude=6.0,
        noise_stddev=0.5,
        min_value=-20.0,
        max_value=120.0,
        thresholds=ThresholdBand(warning_max=36.0, critical_max=42.0),
        period_seconds=600.0,
    ),
    SensorKind.PRESSURE: SensorProfile(
        kind=SensorKind.PRESSURE,
        unit="bar",
        baseline=5.5,
        amplitude=1.2,
        noise_stddev=0.15,
        min_value=0.0,
        max_value=15.0,
        thresholds=ThresholdBand(warning_max=7.0, critical_max=8.5),
        period_seconds=180.0,
    ),
    SensorKind.HUMIDITY: SensorProfile(
        kind=SensorKind.HUMIDITY,
        unit="%RH",
        baseline=45.0,
        amplitude=12.0,
        noise_stddev=1.5,
        min_value=0.0,
        max_value=100.0,
        thresholds=ThresholdBand(warning_max=62.0, critical_max=72.0),
        period_seconds=900.0,
    ),
    SensorKind.VIBRATION: SensorProfile(
        kind=SensorKind.VIBRATION,
        unit="mm/s",
        baseline=1.5,
        amplitude=1.0,
        noise_stddev=0.3,
        min_value=0.0,
        max_value=50.0,
        thresholds=ThresholdBand(warning_max=4.5, critical_max=7.1),
        period_seconds=120.0,
    ),
}
