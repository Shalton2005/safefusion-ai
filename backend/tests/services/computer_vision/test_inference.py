"""Tests for CV inference backends (FakeYoloAdapter, UltralyticsYoloAdapter lazy-import)."""

from __future__ import annotations

import pytest

from src.services.computer_vision.inference import DEFAULT_CLASS_NAME_MAP, FakeYoloAdapter, UltralyticsYoloAdapter
from src.services.computer_vision.schemas import BoundingBox, DetectionLabel


class TestFakeYoloAdapter:
    def test_returns_canned_detections(self) -> None:
        adapter = FakeYoloAdapter(
            canned_detections=[
                (DetectionLabel.PERSON, 0.9, BoundingBox(0.0, 0.0, 0.5, 0.5)),
                (DetectionLabel.HELMET, 0.8, BoundingBox(0.0, 0.0, 0.2, 0.2)),
            ]
        )
        frame = adapter.detect(frame=None, camera_id="CAM-1", zone="Zone-A", frame_index=3)

        assert frame.camera_id == "CAM-1"
        assert frame.zone == "Zone-A"
        assert frame.frame_index == 3
        assert len(frame.detections) == 2
        assert frame.labels() == {DetectionLabel.PERSON, DetectionLabel.HELMET}

    def test_same_canned_detections_returned_on_every_call(self) -> None:
        adapter = FakeYoloAdapter(
            canned_detections=[(DetectionLabel.SMOKE, 0.95, BoundingBox(0.1, 0.1, 0.9, 0.9))]
        )
        first = adapter.detect(frame=None, camera_id="CAM-1", zone="Zone-A", frame_index=0)
        second = adapter.detect(frame="anything", camera_id="CAM-1", zone="Zone-A", frame_index=1)

        assert [d.label for d in first.detections] == [d.label for d in second.detections]
        assert [d.confidence for d in first.detections] == [d.confidence for d in second.detections]

    def test_empty_canned_detections_produces_empty_frame(self) -> None:
        adapter = FakeYoloAdapter(canned_detections=[])
        frame = adapter.detect(frame=None, camera_id="CAM-2", zone="Zone-B", frame_index=0)
        assert frame.detections == ()


class TestUltralyticsYoloAdapterLazyImport:
    def test_constructing_without_ultralytics_installed_raises_import_error(self) -> None:
        try:
            import ultralytics  # noqa: F401

            pytest.skip("ultralytics is installed in this environment; lazy-import guard not exercised")
        except ImportError:
            pass

        with pytest.raises(ImportError, match="ultralytics"):
            UltralyticsYoloAdapter(model_path="yolov8n.pt")

    def test_module_import_itself_never_requires_ultralytics(self) -> None:
        # If this module-level import at the top of this file succeeded
        # (it always must, for pytest to even collect this test), then
        # importing src.services.computer_vision.inference does not
        # require ultralytics to be installed.
        assert UltralyticsYoloAdapter is not None


class TestDefaultClassNameMap:
    def test_covers_every_detection_label_at_least_once(self) -> None:
        mapped_labels = set(DEFAULT_CLASS_NAME_MAP.values())
        assert mapped_labels == set(DetectionLabel)
