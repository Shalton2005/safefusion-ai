"""Runs one ``DemoScenario`` end to end: publishes events, evaluates every engine.

``DemoScenarioRunner.run()`` is the single entry point for a live
demonstration: given a scenario, it (1) publishes every fixture as an
event on the Unified Event Bus, then (2) feeds the same fixed data through
the exact production rule chain — Compound Risk -> Emergency Response ->
Compliance -> Recommendation — and returns everything as one
``DemoScenarioResult``.

Determinism guarantee: every engine involved is pure/rule-based with no
randomness and no DB access (see each engine's own module docstring), and
every timestamp a scenario produces is computed relative to the fixed
``DEMO_ANCHOR_TIME`` rather than wall-clock ``now()`` (see
``src.services.demo_scenarios.schemas``). Running ``run()`` for the same
scenario any number of times therefore produces byte-identical
``recommendations`` — verified in
``tests/services/demo_scenarios/test_determinism.py``.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from src.services.compliance.schemas import IncidentComplianceResult
from src.services.compound_risk.schemas import ZoneCompoundRiskResult
from src.services.demo_scenarios.engines import (
    build_compliance_engine,
    build_compound_risk_engine,
    build_emergency_response_engine,
    build_recommendation_engine,
)
from src.services.demo_scenarios.events import publish_scenario_events
from src.services.demo_scenarios.schemas import DemoScenario
from src.services.demo_scenarios.summaries import (
    build_incidents,
    build_maintenance_summary,
    build_permit_summary,
    build_sensor_summary,
    build_worker_summary,
)
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult
from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.schemas import Event
from src.services.recommendation.schemas import Recommendation


@dataclass(frozen=True)
class DemoScenarioResult:
    """Everything one deterministic scenario run produced.

    Attributes:
        scenario: The scenario that was run.
        published_events: Every event published to the bus, in order.
        compound_risk_results: Compound Risk Engine output for the
            scenario's zone (empty list if no compound rule fired).
        emergency_response_results: Emergency Response Engine output.
        compliance_results: Compliance Rule Engine output, one entry per
            scenario incident.
        recommendations: The final ordered recommendation list — this is
            what a live demo audience should see as "the AI's answer" to
            the scenario.
    """

    scenario: DemoScenario
    published_events: list[Event] = field(default_factory=list)
    compound_risk_results: list[ZoneCompoundRiskResult] = field(default_factory=list)
    emergency_response_results: list[ZoneEmergencyResponseResult] = field(default_factory=list)
    compliance_results: list[IncidentComplianceResult] = field(default_factory=list)
    recommendations: list[Recommendation] = field(default_factory=list)


class DemoScenarioRunner:
    """Publishes a scenario's events and evaluates it through the full rule chain."""

    def __init__(self, dispatcher: EventDispatcher) -> None:
        """Args:
        dispatcher: Where scenario events are published. Pass
            ``get_default_dispatcher()`` for a live demo so any
            process-wide subscriber (e.g. a console listener) sees the
            events; pass a fresh ``EventDispatcher()`` for an isolated
            run (e.g. a test asserting on ``published_events`` alone).
        """
        self._dispatcher = dispatcher

    def run(self, scenario: DemoScenario) -> DemoScenarioResult:
        """Publish ``scenario``'s events and evaluate it through every rule engine."""
        published_events = publish_scenario_events(scenario, self._dispatcher)

        sensor_summary = build_sensor_summary(scenario)
        permit_summary = build_permit_summary(scenario)
        worker_summary = build_worker_summary(scenario)
        maintenance_summary = build_maintenance_summary(scenario)
        incidents = build_incidents(scenario)

        compound_risk_engine = build_compound_risk_engine(equipment_zone_map=scenario.equipment_zone_map)
        compound_risk_results = compound_risk_engine.evaluate(
            sensor_summary=sensor_summary,
            permit_summary=permit_summary,
            worker_summary=worker_summary,
            maintenance_summary=maintenance_summary,
        )

        emergency_response_engine = build_emergency_response_engine()
        emergency_response_results = emergency_response_engine.evaluate(compound_risk_results)

        compliance_engine = build_compliance_engine()
        compliance_results = compliance_engine.evaluate_many(incidents)

        recommendation_engine = build_recommendation_engine()
        recommendations = recommendation_engine.generate(
            compound_risk_results=compound_risk_results,
            emergency_response_results=emergency_response_results,
            compliance_results=compliance_results,
        )

        return DemoScenarioResult(
            scenario=scenario,
            published_events=published_events,
            compound_risk_results=compound_risk_results,
            emergency_response_results=emergency_response_results,
            compliance_results=compliance_results,
            recommendations=recommendations,
        )
