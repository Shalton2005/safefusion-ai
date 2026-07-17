"""Tests for the in-memory metrics aggregator (src.utils.metrics)."""

from __future__ import annotations

import threading

from src.utils.metrics import MetricsRegistry, default_metrics_registry


class TestMetricsRegistryRecordAndSnapshot:
    def test_snapshot_is_empty_before_anything_recorded(self) -> None:
        registry = MetricsRegistry()

        assert registry.snapshot() == ()

    def test_recording_one_measurement_produces_one_operation_entry(self) -> None:
        registry = MetricsRegistry()

        registry.record("agent_execution", 12.5)

        [stats] = registry.snapshot()
        assert stats.operation == "agent_execution"
        assert stats.count == 1
        assert stats.min_ms == 12.5
        assert stats.max_ms == 12.5
        assert stats.last_ms == 12.5
        assert stats.avg_ms == 12.5

    def test_multiple_measurements_aggregate_correctly(self) -> None:
        registry = MetricsRegistry()

        registry.record("llm_generate", 10.0)
        registry.record("llm_generate", 30.0)
        registry.record("llm_generate", 20.0)

        [stats] = registry.snapshot()
        assert stats.count == 3
        assert stats.min_ms == 10.0
        assert stats.max_ms == 30.0
        assert stats.last_ms == 20.0
        assert stats.avg_ms == 20.0

    def test_different_operations_are_tracked_independently(self) -> None:
        registry = MetricsRegistry()

        registry.record("retrieval", 5.0)
        registry.record("graph_query", 8.0)
        registry.record("retrieval", 15.0)

        snapshot = {s.operation: s for s in registry.snapshot()}
        assert snapshot["retrieval"].count == 2
        assert snapshot["retrieval"].avg_ms == 10.0
        assert snapshot["graph_query"].count == 1
        assert snapshot["graph_query"].avg_ms == 8.0

    def test_snapshot_is_sorted_by_operation_name(self) -> None:
        registry = MetricsRegistry()
        registry.record("workflow", 1.0)
        registry.record("agent_execution", 1.0)
        registry.record("llm_generate", 1.0)

        operations = [s.operation for s in registry.snapshot()]

        assert operations == sorted(operations)

    def test_stats_for_unknown_operation_returns_none(self) -> None:
        registry = MetricsRegistry()

        assert registry.stats_for("never_recorded") is None

    def test_stats_for_known_operation_matches_snapshot(self) -> None:
        registry = MetricsRegistry()
        registry.record("graph_query", 42.0)

        stats = registry.stats_for("graph_query")

        assert stats is not None
        assert stats.operation == "graph_query"
        assert stats.count == 1

    def test_reset_clears_all_recorded_data(self) -> None:
        registry = MetricsRegistry()
        registry.record("retrieval", 5.0)

        registry.reset()

        assert registry.snapshot() == ()
        assert registry.stats_for("retrieval") is None


class TestMetricsRegistryThreadSafety:
    def test_concurrent_recording_does_not_lose_measurements(self) -> None:
        registry = MetricsRegistry()
        iterations_per_thread = 200
        thread_count = 8

        def record_many() -> None:
            for _ in range(iterations_per_thread):
                registry.record("agent_execution", 1.0)

        threads = [threading.Thread(target=record_many) for _ in range(thread_count)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        stats = registry.stats_for("agent_execution")
        assert stats is not None
        assert stats.count == iterations_per_thread * thread_count


class TestDefaultMetricsRegistry:
    def test_returns_the_same_instance_across_calls(self) -> None:
        assert default_metrics_registry() is default_metrics_registry()
