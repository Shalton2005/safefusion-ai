"""Lightweight elapsed-time measurement for structured logging.

Every AI-layer timing point (agent execution, RAG retrieval, graph
queries, LLM calls, overall workflow duration) needs the same three
lines — start a clock, run the operation, log the elapsed
milliseconds — repeated at each call site. :func:`timed` factors that
out into one context manager so the instrumentation is a single ``with``
statement rather than copy-pasted ``time.perf_counter()`` pairs.

Not a full metrics library: no Prometheus/OpenTelemetry dependency, no
export pipeline. It does, however, feed
:func:`~src.utils.metrics.default_metrics_registry` on every call (see
``record=`` below) so ``operation=... duration_ms=...`` isn't *just* a
structured log line — the same measurement is also available as
queryable count/min/avg/max/last via :class:`~src.utils.metrics.MetricsRegistry`,
which the ``/ai/metrics`` monitoring endpoint reads. The log format
(``%(asctime)s | %(levelname)-8s | %(name)s | req=%(request_id)s | %(message)s`` —
see ``src/utils/logger.py``) only renders what's named in the format
string, so ``duration_ms`` is interpolated directly into the message
text (``key=%s`` tokens), never passed via ``extra=`` — a value passed
that way would be silently dropped from the output.
"""

from __future__ import annotations

import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from logging import Logger
from typing import Generator

from src.utils.metrics import MetricsRegistry, default_metrics_registry


@dataclass(slots=True)
class Timer:
    """Mutable holder for one operation's elapsed time, filled in when its ``with`` block exits.

    A plain float can't be written back to the caller from inside a
    context manager (the ``with ... as x`` binding happens before the
    body runs), so :func:`timed` hands back this small mutable box
    instead — read ``timer.elapsed_ms`` after the ``with`` block, not
    during it.
    """

    elapsed_ms: float = field(default=0.0)


@contextmanager
def timed(
    logger: Logger,
    operation: str,
    *,
    level: int = 20,  # logging.INFO — avoids importing the logging module just for the constant
    metrics: MetricsRegistry | None = None,
    **labels: object,
) -> Generator[Timer, None, None]:
    """Measure, log, and record the wall-clock duration of the wrapped block.

    Args:
        logger: Destination logger — pass the caller's own
            ``get_logger(__name__)`` so the log line's ``name`` field
            attributes the timing to the right module, not this one.
        operation: Short, stable identifier for what was timed (e.g.
            ``"agent_execution"``, ``"retrieval"``, ``"graph_query"``,
            ``"llm_generate"``, ``"workflow"``) — becomes the first
            ``key=value`` token in the log line, and the key
            :class:`~src.utils.metrics.MetricsRegistry` groups
            measurements under, so every timing measurement across the
            codebase is grep-able and queryable by operation name.
        level: ``logging`` level for the emitted line. Defaults to
            INFO — timing is routine telemetry, not a warning.
        metrics: Registry to record this measurement into. Defaults to
            :func:`~src.utils.metrics.default_metrics_registry` — the
            process-wide instance the ``/ai/metrics`` endpoint reads.
            Pass an isolated :class:`~src.utils.metrics.MetricsRegistry`
            (or ``metrics=None`` is not itself an opt-out; construct a
            throwaway registry instead) in tests that shouldn't pollute
            shared process state.
        **labels: Additional ``key=value`` context to attach (e.g.
            ``agent="risk"``, ``model="llama3.1:8b"``) — rendered in
            the same message string, in insertion order, after
            ``operation`` and before ``duration_ms``. Not recorded into
            ``metrics`` — the registry aggregates by ``operation`` alone,
            since per-label breakdowns (e.g. per-agent) would multiply
            the number of tracked series for a "lightweight" aggregator.

    Yields:
        A :class:`Timer` whose ``elapsed_ms`` is populated once the
        ``with`` block exits (on both success and exception — a slow
        failure is exactly as worth measuring as a slow success).

    Example::

        with timed(logger, "graph_query", query="workers_by_zone") as timer:
            result = session.run(...)
        # -> logs: operation=graph_query query=workers_by_zone duration_ms=12.34
        # -> records duration_ms into default_metrics_registry() under "graph_query"
    """
    registry = metrics if metrics is not None else default_metrics_registry()
    label_text = " ".join(f"{key}={value}" for key, value in labels.items())
    timer = Timer()
    start = time.perf_counter()
    try:
        yield timer
    finally:
        timer.elapsed_ms = (time.perf_counter() - start) * 1_000
        message = f"operation={operation}" + (f" {label_text}" if label_text else "") + f" duration_ms={timer.elapsed_ms:.2f}"
        logger.log(level, message)
        registry.record(operation, timer.elapsed_ms)
