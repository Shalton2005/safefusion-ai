"""Tests for the lightweight timing helper (src.utils.timing)."""

from __future__ import annotations

import logging
import time

import pytest

from src.utils.metrics import MetricsRegistry
from src.utils.timing import Timer, timed


@pytest.fixture
def logger() -> logging.Logger:
    log = logging.getLogger("test.timing")
    log.setLevel(logging.DEBUG)
    return log


@pytest.fixture
def metrics() -> MetricsRegistry:
    """An isolated registry — real call sites default to the shared process-wide
    one, but tests must not pollute that global state."""
    return MetricsRegistry()


class TestTimed:
    def test_yields_a_timer_with_elapsed_ms_populated_after_exit(self, logger: logging.Logger, metrics: MetricsRegistry) -> None:
        with timed(logger, "demo_op", metrics=metrics) as timer:
            time.sleep(0.02)

        assert isinstance(timer, Timer)
        assert timer.elapsed_ms >= 20.0

    def test_elapsed_ms_is_zero_before_the_block_exits(self, logger: logging.Logger, metrics: MetricsRegistry) -> None:
        with timed(logger, "demo_op", metrics=metrics) as timer:
            assert timer.elapsed_ms == 0.0

    def test_logs_operation_name_and_duration(self, logger: logging.Logger, metrics: MetricsRegistry, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level(logging.INFO, logger="test.timing"):
            with timed(logger, "demo_op", metrics=metrics):
                pass

        assert len(caplog.records) == 1
        message = caplog.records[0].message
        assert "operation=demo_op" in message
        assert "duration_ms=" in message

    def test_labels_are_rendered_as_key_value_tokens(self, logger: logging.Logger, metrics: MetricsRegistry, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level(logging.INFO, logger="test.timing"):
            with timed(logger, "agent_execution", metrics=metrics, agent="risk", zone="Boiler-Area"):
                pass

        message = caplog.records[0].message
        assert "agent=risk" in message
        assert "zone=Boiler-Area" in message
        # Operation comes first, duration comes last, so a reader can grep
        # `operation=X` and still see every other field on the same line.
        assert message.index("operation=") < message.index("agent=risk") < message.index("duration_ms=")

    def test_no_labels_still_produces_a_clean_log_line(self, logger: logging.Logger, metrics: MetricsRegistry, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level(logging.INFO, logger="test.timing"):
            with timed(logger, "demo_op", metrics=metrics):
                pass

        message = caplog.records[0].message
        assert message.startswith("operation=demo_op duration_ms=")
        assert "  " not in message  # no leftover double space when there are no labels

    def test_logs_even_when_the_wrapped_block_raises(self, logger: logging.Logger, metrics: MetricsRegistry, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level(logging.INFO, logger="test.timing"):
            with pytest.raises(ValueError):
                with timed(logger, "demo_op", metrics=metrics):
                    raise ValueError("boom")

        assert len(caplog.records) == 1
        assert "operation=demo_op" in caplog.records[0].message

    def test_exception_propagates_through_the_context_manager(self, logger: logging.Logger, metrics: MetricsRegistry) -> None:
        with pytest.raises(ValueError, match="boom"):
            with timed(logger, "demo_op", metrics=metrics):
                raise ValueError("boom")

    def test_default_level_is_info(self, logger: logging.Logger, metrics: MetricsRegistry, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level(logging.INFO, logger="test.timing"):
            with timed(logger, "demo_op", metrics=metrics):
                pass

        assert caplog.records[0].levelno == logging.INFO

    def test_custom_level_is_honored(self, logger: logging.Logger, metrics: MetricsRegistry, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level(logging.DEBUG, logger="test.timing"):
            with timed(logger, "demo_op", metrics=metrics, level=logging.DEBUG):
                pass

        assert caplog.records[0].levelno == logging.DEBUG

    def test_duration_ms_formatted_to_two_decimal_places(self, logger: logging.Logger, metrics: MetricsRegistry, caplog: pytest.LogCaptureFixture) -> None:
        with caplog.at_level(logging.INFO, logger="test.timing"):
            with timed(logger, "demo_op", metrics=metrics):
                pass

        message = caplog.records[0].message
        duration_token = next(token for token in message.split() if token.startswith("duration_ms="))
        decimal_part = duration_token.split(".")[1]
        assert len(decimal_part) == 2


class TestTimedRecordsMetrics:
    def test_successful_block_records_a_measurement(self, logger: logging.Logger, metrics: MetricsRegistry) -> None:
        with timed(logger, "demo_op", metrics=metrics):
            pass

        stats = metrics.stats_for("demo_op")
        assert stats is not None
        assert stats.count == 1

    def test_failed_block_still_records_a_measurement(self, logger: logging.Logger, metrics: MetricsRegistry) -> None:
        with pytest.raises(ValueError):
            with timed(logger, "demo_op", metrics=metrics):
                raise ValueError("boom")

        stats = metrics.stats_for("demo_op")
        assert stats is not None
        assert stats.count == 1

    def test_recorded_duration_matches_the_timer(self, logger: logging.Logger, metrics: MetricsRegistry) -> None:
        with timed(logger, "demo_op", metrics=metrics) as timer:
            time.sleep(0.01)

        stats = metrics.stats_for("demo_op")
        assert stats is not None
        assert stats.last_ms == round(timer.elapsed_ms, 2)

    def test_defaults_to_the_shared_process_wide_registry(self, logger: logging.Logger) -> None:
        from src.utils.metrics import default_metrics_registry

        default_metrics_registry().reset()
        with timed(logger, "demo_op_shared"):
            pass

        stats = default_metrics_registry().stats_for("demo_op_shared")
        assert stats is not None
        assert stats.count == 1
