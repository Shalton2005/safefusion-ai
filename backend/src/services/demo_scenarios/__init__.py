"""Deterministic Demo Scenarios for SafeFusion AI.

Eight named, fully self-contained situations (see ``scenarios.py``) built
for live demonstrations: each publishes its fixed sensor/worker/permit/
maintenance data as events on the Unified Event Bus (see
``src.services.event_bus``), then runs the exact same Compound Risk ->
Emergency Response -> Compliance -> Recommendation pipeline production
uses (see ``src.services.recommendation``). Nothing in this package calls
``random`` or ``datetime.now()`` — every scenario's data is a literal
constant and every derived timestamp is computed relative to a fixed
``DEMO_ANCHOR_TIME`` — so a scenario produces byte-identical AI
recommendations on every run, in any process, forever.

Quick start::

    from src.services.demo_scenarios import DemoScenarioRunner, GAS_LEAK
    from src.services.event_bus.bus import get_default_dispatcher

    runner = DemoScenarioRunner(dispatcher=get_default_dispatcher())
    result = runner.run(GAS_LEAK)
    for recommendation in result.recommendations:
        print(recommendation.message)

See ``scripts/run_demo_scenario.py`` for a CLI wrapper suited to running a
scenario live during a presentation.
"""

from src.services.demo_scenarios.engines import (
    build_compliance_engine,
    build_compound_risk_engine,
    build_emergency_response_engine,
    build_recommendation_engine,
)
from src.services.demo_scenarios.events import publish_scenario_events
from src.services.demo_scenarios.runner import DemoScenarioResult, DemoScenarioRunner
from src.services.demo_scenarios.schemas import (
    DEMO_ANCHOR_TIME,
    DemoIncident,
    DemoMaintenanceLog,
    DemoPermit,
    DemoScenario,
    DemoSensorReading,
    DemoWorker,
)
from src.services.demo_scenarios.scenarios import (
    ALL_SCENARIOS,
    COMPOUND_RISK,
    CONFINED_SPACE,
    EXPIRED_PERMIT,
    FIRE,
    GAS_LEAK,
    NORMAL,
    PERMIT_VIOLATION,
    SCENARIOS_BY_NAME,
    WORKER_COLLAPSE,
)

__all__ = [
    "DEMO_ANCHOR_TIME",
    "DemoScenario",
    "DemoSensorReading",
    "DemoWorker",
    "DemoPermit",
    "DemoMaintenanceLog",
    "DemoIncident",
    "DemoScenarioRunner",
    "DemoScenarioResult",
    "publish_scenario_events",
    "build_compound_risk_engine",
    "build_emergency_response_engine",
    "build_compliance_engine",
    "build_recommendation_engine",
    "ALL_SCENARIOS",
    "SCENARIOS_BY_NAME",
    "NORMAL",
    "GAS_LEAK",
    "EXPIRED_PERMIT",
    "COMPOUND_RISK",
    "FIRE",
    "PERMIT_VIOLATION",
    "WORKER_COLLAPSE",
    "CONFINED_SPACE",
]
