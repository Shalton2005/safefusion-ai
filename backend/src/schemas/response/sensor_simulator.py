"""Response models for the Industrial Sensor Simulator API (Pydantic v2)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from src.services.sensor_simulator.schemas import ReadingStatus, SensorKind


class SimulatedSensorReadingResponse(BaseModel):
    """A single simulated telemetry point."""

    model_config = ConfigDict(from_attributes=True)

    sensor_id: str
    zone: str
    kind: SensorKind
    value: float
    unit: str
    status: ReadingStatus
    timestamp: datetime


class SimulatedBatchResponse(BaseModel):
    """One simulation tick: a batch of readings across all configured sensors."""

    generated_at: datetime
    readings: list[SimulatedSensorReadingResponse]
