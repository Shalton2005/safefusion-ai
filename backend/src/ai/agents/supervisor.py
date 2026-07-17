"""AI Supervisor — routes a user request to the agents it needs and aggregates their output.

Responsibilities (see module-level flow in :meth:`Supervisor.handle`):
    1. Receive a user request (:class:`~src.ai.agents.base.AgentRequest`).
    2. Determine which agents are required (delegated to a
       :class:`~src.ai.agents.routing.RoutingStrategy` — never hardcoded here).
    3. Execute the selected agents in sequence, via the
       :class:`~src.ai.agents.registry.AgentRegistry`.
    4. Aggregate their :class:`~src.ai.agents.base.AgentResult` objects.
    5. Return a single structured :class:`SupervisorResponse`.

Extensibility: this class contains no ``if agent == "risk"`` branching
and no fixed agent list. It only knows the :class:`RoutingStrategy` and
:class:`AgentRegistry` Protocols/collaborators. A new agent becomes
reachable purely by registering it (``registry.register(...)``) and
covering it in whatever routing strategy is configured — see
``src/ai/agents/routing.py`` for how the default strategy is extended.

The one piece of built-in sequencing knowledge is the Risk -> Emergency
data handoff (Emergency needs Risk's zone results as input — see
``src/ai/agents/emergency_agent.py``). That handoff is expressed as a
plain post-execution enrichment step, not a special case in the routing
or execution loop, so adding a *different* agent dependency later (e.g.
Compliance feeding into a future reporting agent) follows the same
pattern without altering the core loop.

Observability: :meth:`Supervisor.handle` times the whole routing +
execution + aggregation lifecycle (``operation=workflow``), and each
``agent.run()`` call is individually timed
(``operation=agent_execution agent=<name>``), via
:func:`~src.utils.timing.timed`. This is distinct from
:class:`~src.middleware.logging_middleware.RequestLoggingMiddleware`'s
HTTP-level ``duration_ms`` — that measures the whole request including
FastAPI dependency injection and response serialization; this measures
just the Supervisor's own work, so a slow request can be attributed to
"routing/agents" vs. "everything else" from the log lines alone.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from src.ai.agents.base import AgentRequest, AgentResult
from src.ai.agents.registry import AgentRegistry
from src.ai.agents.routing import RoutingStrategy
from src.utils.logger import get_logger
from src.utils.timing import timed

logger = get_logger(__name__)


@dataclass(frozen=True, slots=True)
class SupervisorResponse:
    """Structured response returned to the caller.

    Attributes:
        request_text: Echo of the original request, for traceability.
        route: Ordered agent names the router selected and the
            supervisor executed, in execution order.
        results: One :class:`AgentResult` per agent that ran, in
            execution order. Includes failed agents (``result.ok is
            False``) rather than dropping them — callers see the full
            picture of what was attempted.
        summary: A single aggregated human-readable summary, built by
            joining each successful agent's own summary.
    """

    request_text: str
    route: tuple[str, ...]
    results: tuple[AgentResult, ...]
    summary: str

    @property
    def ok(self) -> bool:
        """True if every executed agent succeeded (empty route counts as ok)."""
        return all(result.ok for result in self.results)

    def result_for(self, agent_name: str) -> AgentResult | None:
        return next((result for result in self.results if result.agent == agent_name), None)


def _risk_to_emergency_handoff(data: Any) -> Any:
    """Unwrap Risk agent output into the ``ZoneCompoundRiskResult`` list Emergency needs.

    The Risk agent's public ``AgentResult.data`` is
    ``list[RiskAssessment]`` (see ``src/ai/agents/risk_agent.py``), but
    ``EmergencyAgent``/``EmergencyResponseService`` need the raw engine
    results each assessment was built from.
    """
    return [assessment.raw_compound_risk_result for assessment in data]


# Agents whose output the supervisor knows how to forward to a later
# agent in the same run. Keyed by the *producing* agent; the value is
# ``(params_key, extractor)`` — the params key the *consuming* agent
# reads (see ``src/ai/agents/emergency_agent.py``) and a function that
# turns the producing agent's ``AgentResult.data`` into what the
# consumer expects. Extending this dict is how a future producer/
# consumer pair gets wired without touching the execution loop below.
_HANDOFFS: dict[str, tuple[str, Callable[[Any], Any]]] = {
    "risk": ("risk_results", _risk_to_emergency_handoff),
}


def known_handoffs() -> tuple[tuple[str, str], ...]:
    """Every configured producer -> consumer-param handoff, as ``(producer, consumer_param)`` pairs.

    Read-only introspection for callers that want to describe the
    workflow's wiring (e.g. the ``/ai/workflow`` monitoring endpoint —
    see ``src/ai/monitoring/service.py``) without reaching into
    :data:`_HANDOFFS` directly, which would also expose each entry's
    private extractor callable. Doesn't identify the *consuming* agent
    by name — that's implicit in which agent later reads
    ``consumer_param`` from its own ``request.params`` (see
    ``src/ai/agents/emergency_agent.py`` for today's only consumer).
    """
    return tuple((producer, params_key) for producer, (params_key, _extract) in _HANDOFFS.items())


class Supervisor:
    """Coordinates specialized agents to answer a single user request."""

    def __init__(self, registry: AgentRegistry, routing_strategy: RoutingStrategy) -> None:
        self._registry = registry
        self._routing_strategy = routing_strategy

    def handle(self, request: AgentRequest) -> SupervisorResponse:
        """Route, execute, and aggregate — the supervisor's full request lifecycle."""
        with timed(logger, "workflow"):
            return self._handle(request)

    def _handle(self, request: AgentRequest) -> SupervisorResponse:
        route = self._routing_strategy.route(request.text, self._registry)
        logger.info("Supervisor routed request to agents=%s", route)

        results: list[AgentResult] = []
        handoff_params: dict[str, Any] = dict(request.params)

        for agent_name in route:
            agent = self._registry.get(agent_name)
            if agent is None:
                # Router named an agent that isn't registered in this
                # deployment — record it as a failed result instead of
                # raising, so one misconfigured route doesn't abort
                # agents that *are* available.
                results.append(
                    AgentResult(agent=agent_name, summary="", error=f"Agent '{agent_name}' is not registered.")
                )
                continue

            scoped_request = AgentRequest(text=request.text, params=dict(handoff_params))
            try:
                with timed(logger, "agent_execution", agent=agent_name):
                    result = agent.run(scoped_request)
            except Exception as exc:  # noqa: BLE001 - a single agent's failure must not abort the rest
                logger.exception("Agent '%s' raised while handling request", agent_name)
                result = AgentResult(agent=agent_name, summary="", error=str(exc))
            results.append(result)

            handoff = _HANDOFFS.get(agent_name)
            if handoff and result.ok:
                handoff_key, extract = handoff
                try:
                    handoff_params[handoff_key] = extract(result.data)
                except Exception as exc:  # noqa: BLE001 - a malformed handoff must not abort the rest
                    # The producing agent reported success, but its data
                    # wasn't the shape the handoff extractor expected
                    # (e.g. a custom/fake agent registered under a
                    # known producer name). Log and skip the handoff
                    # rather than crashing the whole request — the
                    # consuming agent (e.g. Emergency) still runs, just
                    # without this producer's context, the same
                    # degraded-but-alive outcome as if the producer had
                    # failed outright.
                    logger.warning(
                        "Handoff from agent '%s' failed (data=%r): %s", agent_name, result.data, exc
                    )

        return SupervisorResponse(
            request_text=request.text,
            route=tuple(route),
            results=tuple(results),
            summary=_aggregate_summary(results),
        )


def _aggregate_summary(results: list[AgentResult]) -> str:
    """Join each successful agent's summary; note any failures separately."""
    if not results:
        return "No agents were required for this request."

    lines = [f"[{result.agent}] {result.summary}" for result in results if result.ok]
    failures = [f"[{result.agent}] failed: {result.error}" for result in results if not result.ok]
    return " | ".join(lines + failures)
