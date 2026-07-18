"""Tests for DemoScenarioRunner and the determinism guarantee.

These tests are the enforcement mechanism for the feature's core
requirement: every scenario must consistently produce the same AI
recommendations. If a future change (e.g. swapping ``datetime.now()`` in
for the fixed anchor, or introducing randomness into a rule) breaks that
guarantee, one of these tests fails.
"""

from __future__ import annotations

from src.services.demo_scenarios.runner import DemoScenarioRunner
from src.services.demo_scenarios.scenarios import ALL_SCENARIOS, SCENARIOS_BY_NAME
from src.services.event_bus.dispatcher import EventDispatcher


def _recommendation_signature(recommendations) -> list[tuple]:
    return [(r.source, r.zone, r.priority, r.message, r.reason) for r in recommendations]


class TestDemoScenarioRunnerBasics:
    def test_run_publishes_events_for_every_fixture(self) -> None:
        scenario = SCENARIOS_BY_NAME["gas_leak"]
        runner = DemoScenarioRunner(dispatcher=EventDispatcher())
        result = runner.run(scenario)

        expected_event_count = (
            len(scenario.sensors) + len(scenario.workers) + len(scenario.permits) + len(scenario.maintenance_logs)
        )
        assert len(result.published_events) == expected_event_count

    def test_run_returns_result_bound_to_the_scenario(self) -> None:
        scenario = SCENARIOS_BY_NAME["fire"]
        runner = DemoScenarioRunner(dispatcher=EventDispatcher())
        result = runner.run(scenario)
        assert result.scenario is scenario

    def test_normal_scenario_produces_no_recommendations(self) -> None:
        """The 'Normal Plant' baseline must stay a clean, quiet control case."""
        scenario = SCENARIOS_BY_NAME["normal"]
        runner = DemoScenarioRunner(dispatcher=EventDispatcher())
        result = runner.run(scenario)
        assert result.recommendations == []
        assert result.compound_risk_results == []

    def test_gas_leak_scenario_produces_recommendations_from_all_three_sources(self) -> None:
        scenario = SCENARIOS_BY_NAME["gas_leak"]
        runner = DemoScenarioRunner(dispatcher=EventDispatcher())
        result = runner.run(scenario)

        sources = {r.source.value for r in result.recommendations}
        assert sources == {"emergency_response", "compound_risk", "compliance"}

    def test_recommendations_are_sorted_by_priority_ascending(self) -> None:
        scenario = SCENARIOS_BY_NAME["confined_space"]
        runner = DemoScenarioRunner(dispatcher=EventDispatcher())
        result = runner.run(scenario)

        priorities = [r.priority for r in result.recommendations]
        assert priorities == sorted(priorities)


class TestDeterminism:
    def test_every_scenario_produces_identical_recommendations_across_many_runs(self) -> None:
        for scenario in ALL_SCENARIOS:
            signatures = []
            for _ in range(10):
                runner = DemoScenarioRunner(dispatcher=EventDispatcher())
                result = runner.run(scenario)
                signatures.append(_recommendation_signature(result.recommendations))

            assert all(sig == signatures[0] for sig in signatures), (
                f"Scenario '{scenario.name}' produced different recommendations across runs"
            )

    def test_every_scenario_produces_identical_compound_risk_scores_across_runs(self) -> None:
        for scenario in ALL_SCENARIOS:
            scores_by_run = []
            for _ in range(5):
                runner = DemoScenarioRunner(dispatcher=EventDispatcher())
                result = runner.run(scenario)
                scores_by_run.append([(r.zone, r.risk_score, r.risk_level) for r in result.compound_risk_results])

            assert all(scores == scores_by_run[0] for scores in scores_by_run)

    def test_shared_dispatcher_across_runs_does_not_affect_determinism(self) -> None:
        """Running a scenario multiple times against the SAME dispatcher (as a
        live demo would, reusing the process-wide bus) must not accumulate
        state that changes the recommendation outcome."""
        scenario = SCENARIOS_BY_NAME["compound_risk"]
        dispatcher = EventDispatcher()
        runner = DemoScenarioRunner(dispatcher=dispatcher)

        first = _recommendation_signature(runner.run(scenario).recommendations)
        second = _recommendation_signature(runner.run(scenario).recommendations)
        third = _recommendation_signature(runner.run(scenario).recommendations)

        assert first == second == third

    def test_running_different_scenarios_does_not_cross_contaminate(self) -> None:
        """Running scenario A then B on the same dispatcher must not leak A's
        state into B's result (e.g. via a shared mutable rule instance)."""
        dispatcher = EventDispatcher()
        runner = DemoScenarioRunner(dispatcher=dispatcher)

        runner.run(SCENARIOS_BY_NAME["fire"])
        confined_space_first = _recommendation_signature(
            runner.run(SCENARIOS_BY_NAME["confined_space"]).recommendations
        )

        # Re-run confined_space in total isolation and compare.
        isolated_runner = DemoScenarioRunner(dispatcher=EventDispatcher())
        confined_space_isolated = _recommendation_signature(
            isolated_runner.run(SCENARIOS_BY_NAME["confined_space"]).recommendations
        )

        assert confined_space_first == confined_space_isolated


class TestScenarioRegistryIntegrity:
    def test_eight_named_scenarios_exist(self) -> None:
        assert len(ALL_SCENARIOS) == 8

    def test_scenario_names_are_unique(self) -> None:
        names = [s.name for s in ALL_SCENARIOS]
        assert len(names) == len(set(names))

    def test_scenarios_by_name_matches_all_scenarios(self) -> None:
        assert set(SCENARIOS_BY_NAME.keys()) == {s.name for s in ALL_SCENARIOS}

    def test_every_scenario_has_a_narrative_and_title(self) -> None:
        for scenario in ALL_SCENARIOS:
            assert scenario.title
            assert scenario.narrative
            assert scenario.zone
