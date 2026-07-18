"""Camera monitoring summary builder for the Compound Risk Engine.

Mirrors the shape of ``src.services.maintenance_monitoring.MaintenanceMonitoringService``:
a stateless, in-memory summary builder producing the same
``get_monitoring_summary() -> dict`` interface every other monitoring
source in this codebase exposes (sensor/worker/permit/maintenance), so
the compound risk engine's ``camera_summary`` channel is structurally
identical to its siblings rather than a bespoke shape.

Unlike the DB-backed monitoring sources, camera compliance results are
not persisted anywhere yet (no ``camera_events`` table exists) — this
service holds the most recent ``FrameComplianceResult`` per camera
in-memory, populated by whatever drives the CV pipeline (a live inference
loop, a demo scenario, or a route handler). This keeps the Compound Risk
Engine's dependency on Computer Vision to "a summary dict," identical to
how it depends on the other three monitoring sources, with no coupling to
inference or storage details.
"""

from __future__ import annotations

from datetime import datetime, timezone

from src.services.computer_vision.compliance_schemas import FrameComplianceResult


class CameraMonitoringService:
    """Tracks the latest PPE compliance result per camera and summarizes it."""

    def __init__(self) -> None:
        self._latest_by_camera: dict[str, FrameComplianceResult] = {}

    def record(self, result: FrameComplianceResult) -> None:
        """Record ``result`` as the latest known state for its camera."""
        self._latest_by_camera[result.camera_id] = result

    def get_monitoring_summary(self) -> dict:
        """Return a structured camera-compliance summary across every tracked camera.

        Shape mirrors ``SensorMonitoringService``/``MaintenanceMonitoringService``:
        a ``generated_at`` timestamp, aggregate ``counts``, and a flat list
        of per-event rows compound-risk rules can filter/group by zone.
        """
        counts = {"low": 0, "medium": 0, "high": 0, "critical": 0, "total": 0}
        events: list[dict] = []

        for result in self._latest_by_camera.values():
            for safety_event in result.events:
                counts[safety_event.severity.value] += 1
                counts["total"] += 1
                events.append(
                    {
                        "camera_id": safety_event.camera_id,
                        "zone": safety_event.zone,
                        "rule_name": safety_event.rule_name,
                        "label": safety_event.label.value,
                        "severity": safety_event.severity.value,
                        "confidence": safety_event.confidence,
                        "explanation": safety_event.explanation,
                    }
                )

        return {
            "generated_at": datetime.now(timezone.utc),
            "total_cameras": len(self._latest_by_camera),
            "counts": counts,
            "events": events,
        }


_default_camera_monitoring_service: CameraMonitoringService | None = None


def get_default_camera_monitoring_service() -> CameraMonitoringService:
    """Return the process-wide default ``CameraMonitoringService``, creating it on first use.

    Mirrors ``src.services.event_bus.bus.get_default_dispatcher()``: this
    service holds in-memory per-camera state (there is no
    ``camera_events`` table — see the module docstring), so route
    handlers and any CV pipeline driver in the same process must share
    one instance to see each other's recorded frames, the same way every
    event-bus publisher/subscriber shares one default dispatcher.
    """
    global _default_camera_monitoring_service
    if _default_camera_monitoring_service is None:
        _default_camera_monitoring_service = CameraMonitoringService()
    return _default_camera_monitoring_service


def reset_default_camera_monitoring_service() -> None:
    """Discard the process-wide default service and all recorded state.

    Intended for test teardown, mirroring
    ``src.services.event_bus.bus.reset_default_dispatcher()``.
    """
    global _default_camera_monitoring_service
    _default_camera_monitoring_service = None
