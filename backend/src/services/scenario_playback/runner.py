"""Process-wide controller for the Demo Scenario Playback Engine.

Owns the single background ``asyncio`` task that ticks a running
:class:`~src.services.scenario_playback.engine.ScenarioPlaybackEngine`
once per second, each tick opening its own DB session via
:func:`~src.database.session.db_session` (the documented pattern for code
running outside the FastAPI request cycle — see that function's
docstring). Structured as one process-wide singleton, the same convention
``src.services.event_bus.bus.get_default_dispatcher`` and
``src.services.computer_vision.camera_monitoring.get_default_camera_monitoring_service``
already use for state that has no natural per-request scope.

There is exactly one playback slot: starting a new scenario while one is
already running stops the previous run first, so at most one scenario
plays at a time.
"""

from __future__ import annotations

import asyncio

from src.database.session import db_session
from src.services.computer_vision.camera_monitoring import get_default_camera_monitoring_service
from src.services.computer_vision.compliance_engine import (
    MissingHelmetRule,
    MissingSafetyVestRule,
    PPEComplianceEngine,
    SmokeDetectedRule,
)
from src.services.event_bus.bus import get_default_dispatcher
from src.services.scenario_playback.camera_bridge import (
    CAMERA_DETECTION_INTERVAL_SECONDS,
    run_camera_detection_tick,
)
from src.services.scenario_playback.engine import ScenarioPlaybackEngine, ScenarioPlaybackState
from src.services.scenario_playback.schemas import load_scenario_by_name
from src.services.scenario_playback.video_detection import get_video_object_detection_service
from src.utils.logger import get_logger

logger = get_logger(__name__)

_TICK_SECONDS: float = 1.0

#: Same PPE Compliance Engine rule set the real `/cameras/frames` route
#: builds (see `src.routes.computer_vision._build_ppe_compliance_engine`),
#: minus `PersonNearForkliftRule` — scenario playback's video detection
#: never produces a `forklift` label (no forklift-trained checkpoint), so
#: that rule could never fire here.
_camera_compliance_engine = PPEComplianceEngine(
    rules=[MissingHelmetRule(), MissingSafetyVestRule(), SmokeDetectedRule()]
)


class ScenarioPlaybackRunner:
    """Starts/stops the one background playback task for the process."""

    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._engine: ScenarioPlaybackEngine | None = None
        self._last_state: ScenarioPlaybackState | None = None
        self._loop: bool = False
        self._scenario_name: str | None = None
        #: Seconds of playback elapsed since the last real camera-detection
        #: pass (see ``_maybe_run_camera_detection``) — independent of
        #: ``self._engine.elapsed_seconds`` so it survives a scenario loop
        #: restart without needing a reset.
        self._seconds_since_camera_detection: float = CAMERA_DETECTION_INTERVAL_SECONDS
        #: The in-flight background camera-detection task, if any — tracked
        #: so a slow detection pass (~1.7s) is never started twice
        #: concurrently and so ``stop()`` can cancel it cleanly.
        self._camera_detection_task: asyncio.Task | None = None

    @property
    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()

    def status(self) -> ScenarioPlaybackState | None:
        """Return the most recent tick's state, or ``None`` if nothing has ever run."""
        return self._last_state

    async def start(self, scenario_name: str, loop: bool = False) -> ScenarioPlaybackState:
        """Load ``scenario_name`` and begin ticking it once per second.

        Stops any currently running playback first, so starting a new
        scenario always replaces the previous one rather than running two
        concurrently.

        Args:
            loop: When ``True``, automatically restarts the same scenario
                from its first row the instant it finishes, indefinitely,
                until :meth:`stop` is called — used for the always-on demo
                mode (see ``server.py``'s ``_lifespan``). Every restart
                constructs a *fresh* ``ScenarioPlaybackEngine`` (not just a
                reset elapsed-time counter) so the worker/permit UUIDs it
                tracks in memory don't leak from one run into the next —
                each loop iteration creates its own new Worker/Permit rows,
                exactly like a brand-new ``start()`` call would.
        """
        await self.stop()

        self._loop = loop
        self._scenario_name = scenario_name
        self._engine = ScenarioPlaybackEngine(
            timeline=load_scenario_by_name(scenario_name), dispatcher=get_default_dispatcher()
        )
        self._task = asyncio.create_task(self._run_loop(), name=f"scenario-playback-{scenario_name}")
        logger.info(
            "Scenario playback started: %s (%d rows, %.0fs, loop=%s)",
            scenario_name, len(self._engine.timeline.rows), self._engine.timeline.duration_seconds, loop,
        )

        with db_session() as db:
            self._last_state = self._engine.tick(db, tick_seconds=0.0)
        return self._last_state

    async def stop(self) -> None:
        """Cancel the running playback task, if any, and wait for it to finish."""
        self._loop = False
        if self._camera_detection_task is not None:
            self._camera_detection_task.cancel()
            self._camera_detection_task = None
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        self._task = None
        self._engine = None
        logger.info("Scenario playback stopped.")

    def _maybe_run_camera_detection(self) -> None:
        """Launch a real dual-model detection pass in the background if it's due.

        Throttled to ``CAMERA_DETECTION_INTERVAL_SECONDS`` (independent of
        the 1-second scenario tick — see ``camera_bridge``'s module
        docstring for why) and run as a fire-and-forget background task via
        ``asyncio.to_thread`` so the ~1.7s of synchronous, CPU-bound YOLO
        inference never blocks this loop's ``asyncio.sleep`` cadence or any
        concurrent request. Skipped entirely if the previous pass is still
        running (slower than its own interval) or the scenario has no
        associated video.
        """
        assert self._engine is not None
        self._seconds_since_camera_detection += _TICK_SECONDS
        if self._seconds_since_camera_detection < CAMERA_DETECTION_INTERVAL_SECONDS:
            return
        if self._camera_detection_task is not None and not self._camera_detection_task.done():
            return  # Previous pass still running — skip this cycle rather than pile up.

        timeline = self._engine.timeline
        if not timeline.video_filename:
            return

        self._seconds_since_camera_detection = 0.0
        video_filename = timeline.video_filename
        zone = timeline.zone
        timestamp_seconds = self._engine.elapsed_seconds
        frame_index = self._engine.current_row_index

        async def _run() -> None:
            try:
                await asyncio.to_thread(
                    run_camera_detection_tick,
                    get_video_object_detection_service(),
                    _camera_compliance_engine,
                    get_default_camera_monitoring_service(),
                    video_filename,
                    timestamp_seconds,
                    f"CCTV-{zone}",
                    zone,
                    frame_index,
                )
            except Exception:
                logger.exception("Scenario camera detection pass failed; continuing.")

        self._camera_detection_task = asyncio.create_task(_run(), name="scenario-camera-detection")

    async def _run_loop(self) -> None:
        assert self._engine is not None
        try:
            while True:
                while not self._engine.is_finished:
                    await asyncio.sleep(_TICK_SECONDS)
                    try:
                        with db_session() as db:
                            self._last_state = self._engine.tick(db, tick_seconds=_TICK_SECONDS)
                        self._maybe_run_camera_detection()
                    except Exception:
                        logger.exception("Scenario playback tick failed; continuing to next tick.")
                logger.info("Scenario playback finished: %s", self._engine.timeline.name)

                if not self._loop:
                    break

                assert self._scenario_name is not None
                logger.info("Scenario playback looping: restarting %s", self._scenario_name)
                self._engine = ScenarioPlaybackEngine(
                    timeline=load_scenario_by_name(self._scenario_name), dispatcher=get_default_dispatcher()
                )
                with db_session() as db:
                    self._last_state = self._engine.tick(db, tick_seconds=0.0)
        except asyncio.CancelledError:
            raise


_runner: ScenarioPlaybackRunner | None = None


def get_scenario_playback_runner() -> ScenarioPlaybackRunner:
    """Return the process-wide ``ScenarioPlaybackRunner`` singleton, creating it on first use."""
    global _runner
    if _runner is None:
        _runner = ScenarioPlaybackRunner()
    return _runner
