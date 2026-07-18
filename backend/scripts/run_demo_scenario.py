"""Live demo CLI for SafeFusion AI's deterministic demo scenarios.

Publishes one (or all) named scenario's events onto the Unified Event Bus
and prints the resulting AI recommendations to the console — designed to
be run live during a presentation: pick a scenario, narrate what's about
to happen, run it, and the audience sees the exact same recommendations
every time (see ``src.services.demo_scenarios`` for the determinism
guarantee). No database required — everything runs from in-memory fixtures.

Usage:
    cd backend
    python scripts/run_demo_scenario.py --list
    python scripts/run_demo_scenario.py gas_leak
    python scripts/run_demo_scenario.py --all
    python scripts/run_demo_scenario.py fire --show-events
"""

from __future__ import annotations

import argparse
import io
import os
import sys

# Reconfigure stdout to UTF-8 so scenario narratives (which use em-dashes)
# render correctly on Windows consoles defaulting to a legacy codepage,
# without having to avoid non-ASCII characters in prose everywhere else.
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Ensure `src.*` imports resolve when run as a script from backend/scripts.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.services.demo_scenarios import ALL_SCENARIOS, SCENARIOS_BY_NAME, DemoScenarioRunner
from src.services.demo_scenarios.runner import DemoScenarioResult
from src.services.demo_scenarios.schemas import DemoScenario
from src.services.event_bus.bus import get_default_dispatcher

_DIVIDER = "=" * 78


def _print_scenario_header(scenario: DemoScenario) -> None:
    print(_DIVIDER)
    print(f"SCENARIO: {scenario.title}  (zone: {scenario.zone})")
    print(_DIVIDER)
    print(scenario.narrative)
    print()


def _print_events(result: DemoScenarioResult) -> None:
    print(f"-- {len(result.published_events)} event(s) published to the bus --")
    for event in result.published_events:
        print(f"  [{event.source.value}] {event.event_type.value}  event_id={event.event_id}")
    print()


def _print_recommendations(result: DemoScenarioResult) -> None:
    print(f"-- {len(result.recommendations)} AI recommendation(s), ordered by priority --")
    if not result.recommendations:
        print("  (none — this scenario has no elevated risk conditions)")
    for recommendation in result.recommendations:
        print(f"  [{recommendation.priority:>3}] ({recommendation.source.value}) {recommendation.message}")
    print()


def run_and_report(scenario: DemoScenario, show_events: bool) -> DemoScenarioResult:
    runner = DemoScenarioRunner(dispatcher=get_default_dispatcher())
    result = runner.run(scenario)

    _print_scenario_header(scenario)
    if show_events:
        _print_events(result)
    _print_recommendations(result)

    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a deterministic SafeFusion AI demo scenario and show its AI recommendations."
    )
    parser.add_argument(
        "scenario",
        nargs="?",
        choices=sorted(SCENARIOS_BY_NAME),
        help="Name of the scenario to run (see --list).",
    )
    parser.add_argument("--all", action="store_true", help="Run every scenario in sequence.")
    parser.add_argument("--list", action="store_true", help="List available scenario names and exit.")
    parser.add_argument(
        "--show-events",
        action="store_true",
        help="Print each event published to the bus before showing recommendations.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.list:
        for scenario in ALL_SCENARIOS:
            print(f"{scenario.name:20s} {scenario.title}  (zone: {scenario.zone})")
        return

    if args.all:
        for scenario in ALL_SCENARIOS:
            run_and_report(scenario, show_events=args.show_events)
        return

    if not args.scenario:
        print("No scenario given. Use --list to see options, or --all to run every scenario.")
        return

    run_and_report(SCENARIOS_BY_NAME[args.scenario], show_events=args.show_events)


if __name__ == "__main__":
    main()
