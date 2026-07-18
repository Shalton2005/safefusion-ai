"""Tests for CameraMonitoringService and its process-wide default accessor."""

from __future__ import annotations

from src.models.enums import SeverityLevel
from src.services.computer_vision.camera_monitoring import (
    CameraMonitoringService,
    get_default_camera_monitoring_service,
    reset_default_camera_monitoring_service,
)
from src.services.computer_vision.compliance_schemas import FrameComplianceResult, PPESafetyEvent
from src.services.computer_vision.schemas import DetectionLabel


def _event(zone: str, severity: SeverityLevel, camera_id: str = "CAM-1") -> PPESafetyEvent:
    return PPESafetyEvent(
        camera_id=camera_id,
        zone=zone,
        rule_name="missing_helmet",
        label=DetectionLabel.NO_HELMET,
        severity=severity,
        confidence=0.8,
        explanation="test",
        bounding_box=None,
    )


class TestCameraMonitoringService:
    def test_empty_service_has_zero_counts(self) -> None:
        service = CameraMonitoringService()
        summary = service.get_monitoring_summary()
        assert summary["total_cameras"] == 0
        assert summary["counts"] == {"low": 0, "medium": 0, "high": 0, "critical": 0, "total": 0}
        assert summary["events"] == []

    def test_record_populates_summary(self) -> None:
        service = CameraMonitoringService()
        result = FrameComplianceResult(
            camera_id="CAM-1", zone="Zone-A", frame_index=0, events=(_event("Zone-A", SeverityLevel.HIGH),)
        )
        service.record(result)
        summary = service.get_monitoring_summary()

        assert summary["total_cameras"] == 1
        assert summary["counts"]["high"] == 1
        assert summary["counts"]["total"] == 1
        assert summary["events"][0]["zone"] == "Zone-A"

    def test_record_replaces_previous_result_for_same_camera(self) -> None:
        service = CameraMonitoringService()
        service.record(
            FrameComplianceResult(
                camera_id="CAM-1", zone="Zone-A", frame_index=0, events=(_event("Zone-A", SeverityLevel.CRITICAL),)
            )
        )
        service.record(
            FrameComplianceResult(camera_id="CAM-1", zone="Zone-A", frame_index=1, events=())
        )
        summary = service.get_monitoring_summary()

        assert summary["total_cameras"] == 1
        assert summary["counts"]["total"] == 0  # latest frame was compliant

    def test_multiple_cameras_are_tracked_independently(self) -> None:
        service = CameraMonitoringService()
        service.record(
            FrameComplianceResult(
                camera_id="CAM-1", zone="Zone-A", frame_index=0, events=(_event("Zone-A", SeverityLevel.LOW),)
            )
        )
        service.record(
            FrameComplianceResult(
                camera_id="CAM-2", zone="Zone-B", frame_index=0, events=(_event("Zone-B", SeverityLevel.MEDIUM),)
            )
        )
        summary = service.get_monitoring_summary()
        assert summary["total_cameras"] == 2
        assert summary["counts"]["total"] == 2


class TestDefaultCameraMonitoringService:
    def setup_method(self) -> None:
        reset_default_camera_monitoring_service()

    def teardown_method(self) -> None:
        reset_default_camera_monitoring_service()

    def test_returns_a_service_instance(self) -> None:
        assert isinstance(get_default_camera_monitoring_service(), CameraMonitoringService)

    def test_returns_the_same_instance_across_calls(self) -> None:
        assert get_default_camera_monitoring_service() is get_default_camera_monitoring_service()

    def test_reset_produces_a_fresh_instance(self) -> None:
        first = get_default_camera_monitoring_service()
        reset_default_camera_monitoring_service()
        second = get_default_camera_monitoring_service()
        assert first is not second
