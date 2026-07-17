"""Lightweight in-memory aggregation of operation durations recorded by :func:`~src.utils.timing.timed`.

Every call to :func:`~src.utils.timing.timed` already logs one
``operation=... duration_ms=...`` line; this module additionally rolls
those same measurements into a small per-operation summary
(count/min/avg/max/last, plus a bounded recent-samples window) so a
caller — the ``/ai/metrics`` monitoring endpoint — can report real
observed numbers without grepping logs or standing up a metrics
backend.

Deliberately not a real metrics system: one process-local
:class:`MetricsRegistry` singleton, no persistence across restarts, no
percentiles, no export format (Prometheus/StatsD/OTLP). If SafeFusion AI
ever needs cross-process aggregation or historical retention, replace
this module — the call site in :mod:`src.utils.timing` is the only
thing that would need to change; every caller of ``timed()`` stays
untouched.
"""

from __future__ import annotations

import threading
from collections import deque
from dataclasses import dataclass, field

_MAX_RECENT_SAMPLES = 100
"""Bounded per-operation ring buffer size — caps memory regardless of request volume."""


@dataclass(slots=True)
class OperationStats:
    """Aggregated duration statistics for one ``operation`` name.

    Attributes:
        operation: The operation identifier (e.g. ``"agent_execution"``),
            matching :func:`~src.utils.timing.timed`'s ``operation`` arg.
        count: Total number of measurements recorded, including any that
            aged out of ``recent_samples_ms``.
        total_ms: Sum of every recorded duration — divide by ``count``
            for the true all-time average (``recent_samples_ms`` alone
            would under-represent it once ``count`` exceeds the window).
        min_ms: Smallest duration ever recorded.
        max_ms: Largest duration ever recorded.
        last_ms: Most recently recorded duration.
    """

    operation: str
    count: int
    total_ms: float
    min_ms: float
    max_ms: float
    last_ms: float

    @property
    def avg_ms(self) -> float:
        return round(self.total_ms / self.count, 2) if self.count else 0.0


class MetricsRegistry:
    """Thread-safe, in-process aggregator of durations, grouped by operation name.

    Not a global singleton by construction — see :func:`default_metrics_registry`
    for the shared instance every real call site uses — so tests can
    build an isolated registry instead of fighting shared process state.
    """

    def __init__(self, *, max_recent_samples: int = _MAX_RECENT_SAMPLES) -> None:
        self._max_recent_samples = max_recent_samples
        self._lock = threading.Lock()
        self._counts: dict[str, int] = {}
        self._totals_ms: dict[str, float] = {}
        self._mins_ms: dict[str, float] = {}
        self._maxes_ms: dict[str, float] = {}
        self._lasts_ms: dict[str, float] = {}
        self._recent_ms: dict[str, deque[float]] = {}

    def record(self, operation: str, duration_ms: float) -> None:
        """Record one observed duration for ``operation``. Safe to call from any thread."""
        with self._lock:
            self._counts[operation] = self._counts.get(operation, 0) + 1
            self._totals_ms[operation] = self._totals_ms.get(operation, 0.0) + duration_ms
            self._mins_ms[operation] = min(self._mins_ms.get(operation, duration_ms), duration_ms)
            self._maxes_ms[operation] = max(self._maxes_ms.get(operation, duration_ms), duration_ms)
            self._lasts_ms[operation] = duration_ms

            recent = self._recent_ms.setdefault(operation, deque(maxlen=self._max_recent_samples))
            recent.append(duration_ms)

    def snapshot(self) -> tuple[OperationStats, ...]:
        """Return current stats for every operation recorded so far, sorted by operation name."""
        with self._lock:
            return tuple(
                OperationStats(
                    operation=operation,
                    count=self._counts[operation],
                    total_ms=round(self._totals_ms[operation], 2),
                    min_ms=round(self._mins_ms[operation], 2),
                    max_ms=round(self._maxes_ms[operation], 2),
                    last_ms=round(self._lasts_ms[operation], 2),
                )
                for operation in sorted(self._counts)
            )

    def stats_for(self, operation: str) -> OperationStats | None:
        """Return current stats for one operation, or ``None`` if it's never been recorded."""
        with self._lock:
            if operation not in self._counts:
                return None
            return OperationStats(
                operation=operation,
                count=self._counts[operation],
                total_ms=round(self._totals_ms[operation], 2),
                min_ms=round(self._mins_ms[operation], 2),
                max_ms=round(self._maxes_ms[operation], 2),
                last_ms=round(self._lasts_ms[operation], 2),
            )

    def reset(self) -> None:
        """Discard every recorded measurement. Intended for tests, not production use."""
        with self._lock:
            self._counts.clear()
            self._totals_ms.clear()
            self._mins_ms.clear()
            self._maxes_ms.clear()
            self._lasts_ms.clear()
            self._recent_ms.clear()


_default_registry = MetricsRegistry()


def default_metrics_registry() -> MetricsRegistry:
    """The process-wide registry every real ``timed()`` call records into.

    A function (not a bare module attribute) so callers read intent —
    "give me the shared registry" — rather than reaching into module
    internals, matching the ``default_confidence_engine()`` /
    ``default_keyword_routes()`` convention used elsewhere in this
    codebase.
    """
    return _default_registry
