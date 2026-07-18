"""Tests for event payload dataclasses."""

from __future__ import annotations

import uuid

from src.services.event_bus.payloads import (
    ComputerVisionEventPayload,
    MaintenanceEventPayload,
    PermitEventPayload,
    SensorEventPayload,
    WorkerEventPayload,
)


class TestSensorEventPayload:
    def test_as_dict_stringifies_uuid(self) -> None:
        sensor_id = uuid.uuid4()
        payload = SensorEventPayload(
            sensor_id=sensor_id, sensor_type="gas", value=42.0, unit="ppm", status="warning"
        )
        result = payload.as_dict()
        assert result["sensor_id"] == str(sensor_id)
        assert isinstance(result["sensor_id"], str)


class TestWorkerEventPayload:
    def test_as_dict_allows_optional_zone(self) -> None:
        worker_id = uuid.uuid4()
        payload = WorkerEventPayload(worker_id=worker_id, employee_id="EMP-0001", status="working")
        result = payload.as_dict()
        assert result["current_zone"] is None


class TestPermitEventPayload:
    def test_as_dict_round_trips_fields(self) -> None:
        permit_id = uuid.uuid4()
        payload = PermitEventPayload(permit_id=permit_id, permit_type="hot_work", status="active")
        result = payload.as_dict()
        assert result == {
            "permit_id": str(permit_id),
            "permit_type": "hot_work",
            "status": "active",
        }


class TestMaintenanceEventPayload:
    def test_as_dict_round_trips_fields(self) -> None:
        log_id = uuid.uuid4()
        payload = MaintenanceEventPayload(
            log_id=log_id, equipment_id="EQ-001", maintenance_type="corrective", status="ongoing"
        )
        result = payload.as_dict()
        assert result["log_id"] == str(log_id)
        assert result["equipment_id"] == "EQ-001"


class TestComputerVisionEventPayload:
    def test_placeholder_payload_serializes_with_optional_bounding_box(self) -> None:
        payload = ComputerVisionEventPayload(
            camera_id="CAM-01",
            detection_label="missing_ppe",
            confidence=0.92,
            bounding_box=(0.1, 0.2, 0.3, 0.4),
        )
        result = payload.as_dict()
        assert result["camera_id"] == "CAM-01"
        assert result["confidence"] == 0.92
        assert result["bounding_box"] == (0.1, 0.2, 0.3, 0.4)

    def test_bounding_box_defaults_to_none(self) -> None:
        payload = ComputerVisionEventPayload(
            camera_id="CAM-02", detection_label="intrusion", confidence=0.5
        )
        assert payload.as_dict()["bounding_box"] is None
