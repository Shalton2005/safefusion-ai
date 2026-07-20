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
from src.services.event_bus.bus import get_default_dispatcher
from src.services.scenario_playback.engine import ScenarioPlaybackEngine, ScenarioPlaybackState
from src.services.scenario_playback.schemas import load_scenario_by_name
from src.utils.logger import get_logger

logger = get_logger(__name__)

_TICK_SECONDS: float = 1.0


class ScenarioPlaybackRunner:
    """Starts/stops the one background playback task for the process."""

    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._engine: ScenarioPlaybackEngine | None = None
        self._last_state: ScenarioPlaybackState | None = None

    @property
    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()

    def status(self) -> ScenarioPlaybackState | None:
        """Return the most recent tick's state, or ``None`` if nothing has ever run."""
        return self._last_state

    async def start(self, scenario_name: str) -> ScenarioPlaybackState:
        """Load ``scenario_name`` and begin ticking it once per second.

        Stops any currently running playback first, so starting a new
        scenario always replaces the previous one rather than running two
        concurrently.
        """
        await self.stop()

        timeline = load_scenario_by_name(scenario_name)
        self._engine = ScenarioPlaybackEngine(timeline=timeline, dispatcher=get_default_dispatcher())
        self._task = asyncio.create_task(self._run_loop(), name=f"scenario-playback-{scenario_name}")
        logger.info("Scenario playback started: %s (%d rows, %.0fs)", scenario_name, len(timeline.rows), timeline.duration_seconds)

        with db_session() as db:
            self._last_state = self._engine.tick(db, tick_seconds=0.0)
        return self._last_state

    async def stop(self) -> None:
        """Cancel the running playback task, if any, and wait for it to finish."""
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

    async def _run_loop(self) -> None:
        assert self._engine is not None
        try:
            while not self._engine.is_finished:
                await asyncio.sleep(_TICK_SECONDS)
                try:
                    with db_session() as db:
                        self._last_state = self._engine.tick(db, tick_seconds=_TICK_SECONDS)
                except Exception:
                    logger.exception("Scenario playback tick failed; continuing to next tick.")
            logger.info("Scenario playback finished: %s", self._engine.timeline.name)
        except asyncio.CancelledError:
            raise


_runner: ScenarioPlaybackRunner | None = None


def get_scenario_playback_runner() -> ScenarioPlaybackRunner:
    """Return the process-wide ``ScenarioPlaybackRunner`` singleton, creating it on first use."""
    global _runner
    if _runner is None:
        _runner = ScenarioPlaybackRunner()
    return _runner
