"""AI Safety Copilot service — the shared implementation behind all four Copilot endpoints.

Every operation (:meth:`~AiCopilotService.query`,
:meth:`~AiCopilotService.explain`, :meth:`~AiCopilotService.recommend`,
:meth:`~AiCopilotService.chat`) runs the user's request through the
LangGraph-compiled AI Supervisor (see ``src/ai/graph/builder.py`` /
``src/ai/agents/supervisor.py``) to route to and execute whichever
specialized agents (Risk, Compliance, Knowledge, Graph Knowledge,
Emergency) the request needs, then shapes the aggregated result for its
specific use case. ``explain`` and ``chat`` additionally call
:class:`~src.ai.llm.service.LlmService` to turn the agents' structured
output into natural language, grounded in that output as context — never
free-standing generation.

No FastAPI import anywhere in this module. Callers (the routes in
``src/routes/ai_copilot.py``) construct this service with a compiled
graph and an optional :class:`~src.ai.llm.service.LlmService`, then
translate its dataclass results into Pydantic response models.
"""

from __future__ import annotations

from typing import Any, Protocol

from src.ai.agents.base import AgentRequest, AgentResult
from src.ai.agents.explainability_service import explain as build_explainability_report
from src.ai.agents.response_aggregator import aggregate
from src.ai.agents.supervisor import SupervisorResponse
from src.ai.copilot.schemas import (
    AgentTrace,
    ChatResult,
    ExplainabilityResult,
    ExplainResult,
    QueryResult,
    Recommendation,
    RecommendResult,
    ReasoningMetadata,
    SummaryResult,
)
from src.ai.exceptions import AiDependencyError
from src.ai.llm.context import GraphContextItem, LlmContext, RagContextItem, RiskContextItem
from src.ai.llm.service import LlmResponse, LlmService
from src.ai.prompts import COMPLIANCE, EMERGENCY_RESPONSE, GENERAL, RISK_ANALYSIS
from src.utils.logger import get_logger

logger = get_logger(__name__)

# Which src.ai.prompts template best fits a request, inferred from which
# agent produced the Supervisor's first (highest-priority) result. Data,
# not branching logic — matches the same "no hardcoded workflow" rule
# the routing table (src/ai/agents/routing.py) follows. Agents without
# an entry (knowledge, graph_knowledge) fall back to the general
# template via _select_domain's default.
_AGENT_TO_PROMPT_DOMAIN: dict[str, str] = {
    "risk": RISK_ANALYSIS,
    "compliance": COMPLIANCE,
    "emergency": EMERGENCY_RESPONSE,
}


def _select_domain(supervisor_response: SupervisorResponse) -> str:
    """Pick the prompt domain matching the first agent the Supervisor executed.

    "First" (rather than e.g. most agents of one kind, or the
    highest-severity result) because the router already orders agents
    by relevance to the request (see
    ``src.ai.agents.routing.KeywordRoutingStrategy`` — matched agents
    are returned in keyword-table order), so the first executed agent
    is the router's own best guess at what this request is primarily
    about.
    """
    for agent_name in supervisor_response.route:
        if agent_name in _AGENT_TO_PROMPT_DOMAIN:
            return _AGENT_TO_PROMPT_DOMAIN[agent_name]
    return GENERAL


class CompiledGraphPort(Protocol):
    """Contract required from the compiled LangGraph graph.

    Matches ``langgraph.graph.state.CompiledStateGraph.invoke`` — this
    service depends only on this narrow shape, not on the LangGraph
    package itself, so it stays testable with a fake graph.
    """

    def invoke(self, state: dict[str, Any]) -> dict[str, Any]: ...


def run_supervisor(graph: CompiledGraphPort, request: AgentRequest) -> Any:
    """Invoke the compiled graph and return the ``SupervisorResponse`` it produced.

    The graph's entry node is the Supervisor (see
    ``src/ai/graph/nodes.py:make_supervisor_node``), which writes its
    full structured result into ``state["context"]["supervisor_response"]``.
    This is the one place that reaches into that state shape, so every
    Copilot operation goes through the same graph-invocation path rather
    than each hand-rolling its own state dict.
    """
    result_state = graph.invoke(
        {
            "messages": [{"role": "user", "content": request.text}],
            "context": {"params": request.params} if request.params else {},
            "route": None,
        }
    )
    return result_state["context"]["supervisor_response"]


def _build_reasoning(
    supervisor_response: SupervisorResponse, *, model: str | None = None, warnings: tuple[str, ...] = ()
) -> ReasoningMetadata:
    """Build a :class:`ReasoningMetadata` block from a ``SupervisorResponse``."""
    traces = tuple(
        AgentTrace(agent=result.agent, ok=result.ok, summary=result.summary, citations=result.citations, error=result.error)
        for result in supervisor_response.results
    )
    return ReasoningMetadata(route=supervisor_response.route, agent_traces=traces, model=model, warnings=warnings)


def _generate_or_degrade(
    llm_service: LlmService, *, question: str, context: LlmContext, domain: str
) -> tuple[LlmResponse | None, tuple[str, ...]]:
    """Call ``llm_service.generate(...)``, degrading to ``(None, warning)`` instead of raising.

    Every other failure point in the AI layer (each agent's ``run()``,
    the Supervisor's own per-agent try/except in
    ``src/ai/agents/supervisor.py``) already converts a dependency
    failure into "continue without this piece, note why" rather than
    aborting the whole request. The LLM grounding step in
    :meth:`AiCopilotService.explain`/:meth:`AiCopilotService.chat` is the
    one place that didn't follow that rule — it called
    ``LlmService.generate`` with no try/except at all, so an unreachable
    Ollama server 500'd the entire request instead of falling back to
    the Supervisor's own aggregated summary (which both methods already
    use when no ``llm_service`` is configured at all — this reuses that
    same fallback for "configured but unavailable").

    Catches :class:`~src.ai.exceptions.AiDependencyError` (raised by
    :class:`~src.ai.llm.ollama_provider.OllamaLlmProvider` for a
    connection failure, timeout, or error response) as well as any other
    unexpected exception, so a provider-level bug degrades the same way
    a known dependency outage does — never a 500.
    """
    try:
        return llm_service.generate(question=question, context=context, domain=domain), ()
    except AiDependencyError as exc:
        logger.warning("LLM generation unavailable (%s): %s", exc.dependency, exc)
        return None, (f"LLM generation unavailable ({exc.dependency}); returning the aggregated agent summary instead.",)
    except Exception as exc:  # noqa: BLE001 - any LLM-layer failure must not abort the request
        logger.exception("Unexpected error during LLM generation")
        return None, (f"LLM generation failed unexpectedly ({exc}); returning the aggregated agent summary instead.",)


def _build_llm_context(supervisor_response: SupervisorResponse) -> LlmContext:
    """Adapt whichever agents ran into the LLM service's typed context inputs.

    Only agents whose ``AgentResult.data`` shape this function
    recognizes contribute context — an unrecognized or failed agent
    result is skipped rather than raising, since partial context is
    still useful and one agent's odd output shouldn't break generation
    for the others.
    """
    rag_items: list[RagContextItem] = []
    graph_items: list[GraphContextItem] = []
    risk_items: list[RiskContextItem] = []

    for result in supervisor_response.results:
        if not result.ok or result.data is None:
            continue

        if result.agent in ("compliance", "knowledge"):
            rag_items.extend(_extract_rag_items(result))
        elif result.agent == "graph_knowledge":
            graph_items.extend(_extract_graph_items(result))
        elif result.agent == "risk":
            risk_items.extend(RiskContextItem.from_risk_assessment(assessment) for assessment in result.data)
        elif result.agent == "emergency":
            risk_items.extend(_extract_emergency_risk_items(result))

    return LlmContext(rag=rag_items, graph=graph_items, risk=risk_items)


def _append_sources(answer: str, context: LlmContext) -> str:
    """Append a deterministic "Sources:" citation block (see
    :meth:`~src.ai.llm.context.LlmContext.format_sources`) to a
    successfully generated answer.

    Deliberately independent of whether the model's own text already
    cited its sources inline (the system prompts ask it to, but local
    models don't reliably comply) — this guarantees every answer grounded
    in retrieved document context ends with a citation, matching what a
    safety officer needs to verify a claim against its regulation.
    """
    sources = context.format_sources()
    if not sources:
        return answer
    return f"{answer}\n\n{sources}"


def _extract_rag_items(result: AgentResult) -> list[RagContextItem]:
    if result.agent == "knowledge":
        # KnowledgeAgent.data is list[RetrievedChunk].
        return [RagContextItem.from_retrieved_chunk(chunk) for chunk in result.data]
    # ComplianceAgent.data is a single ComplianceAssessment whose
    # compliance_notes are the retrieved passage text, paired 1:1 (by
    # index) with note_sources — NOT relevant_regulations, which is
    # deduped by document and would misalign as soon as one document
    # contributes more than one retrieved chunk (see
    # ComplianceAssessment's docstring).
    assessment = result.data
    return [
        RagContextItem(content=note, source=source, title=title, page=page)
        for note, (source, title, page) in zip(assessment.compliance_notes, assessment.note_sources)
    ]


def _extract_graph_items(result: AgentResult) -> list[GraphContextItem]:
    knowledge_result = result.data
    items: list[GraphContextItem] = []
    for category in ("worker_relationships", "equipment_relationships", "zone_relationships", "incident_history"):
        for relationship in getattr(knowledge_result, category):
            items.append(GraphContextItem.from_graph_relationship(category, relationship))
    return items


def _extract_emergency_risk_items(result: AgentResult) -> list[RiskContextItem]:
    """Adapt the Emergency agent's ``EmergencyAssessment`` into risk context, one item per zone.

    ``EmergencyAssessment`` carries risk score/level only inside its
    ``escalation`` entries (one per zone the engine evaluated); dispatched
    actions (immediate_actions/notifications/incident_workflow) are flat
    lists with no risk score of their own. This correlates each zone's
    escalation with its own dispatched actions so the Emergency Response
    template (see ``src/ai/prompts/emergency_response.py``) is actually
    grounded in what was dispatched, not left with an empty risk section.
    """
    assessment = result.data
    actions_by_zone: dict[str, list[str]] = {}
    for action in (*assessment.immediate_actions, *assessment.notifications, *assessment.incident_workflow):
        actions_by_zone.setdefault(action.zone, []).append(f"{action.action}: {action.reason}")

    return [
        RiskContextItem.from_emergency_escalation(escalation, actions_by_zone.get(escalation.zone, []))
        for escalation in assessment.escalation
    ]


def _extract_recommendations(supervisor_response: SupervisorResponse) -> tuple[Recommendation, ...]:
    """Pull structured recommendations out of whichever agents produced them.

    Risk and Compliance expose a flat ``recommendations: list[str]``.
    Emergency has no such field — its actions (immediate_actions,
    notifications, escalation, incident_workflow) are themselves the
    recommended course of action, so each one's ``reason`` is surfaced
    as a recommendation instead.
    """
    recommendations: list[Recommendation] = []

    for result in supervisor_response.results:
        if not result.ok or result.data is None:
            continue

        if result.agent == "risk":
            for assessment in result.data:
                recommendations.extend(
                    Recommendation(source_agent="risk", zone=assessment.zone, text=text)
                    for text in assessment.recommendations
                )
        elif result.agent == "compliance":
            recommendations.extend(
                Recommendation(source_agent="compliance", zone=None, text=text)
                for text in result.data.recommendations
            )
        elif result.agent == "emergency":
            assessment = result.data
            for action in (*assessment.immediate_actions, *assessment.notifications, *assessment.incident_workflow):
                recommendations.append(Recommendation(source_agent="emergency", zone=action.zone, text=action.reason))

    return tuple(recommendations)


class AiCopilotService:
    """Implements the four AI Safety Copilot operations over a LangGraph-compiled Supervisor.

    Args:
        graph: The compiled LangGraph graph whose entry node is the AI
            Supervisor (see ``src/ai/graph/builder.py:build_graph``).
        llm_service: Used by :meth:`explain` and :meth:`chat` to turn
            agent output into natural language. ``None`` disables those
            two operations gracefully (see their docstrings) rather than
            requiring Ollama to be reachable for every Copilot endpoint.
    """

    def __init__(self, graph: CompiledGraphPort, llm_service: LlmService | None = None) -> None:
        self._graph = graph
        self._llm_service = llm_service

    def query(self, *, text: str, params: dict[str, Any] | None = None) -> QueryResult:
        """Run the Supervisor and return its aggregated structured output as-is."""
        supervisor_response = run_supervisor(self._graph, AgentRequest(text=text, params=params or {}))
        agent_data = {result.agent: result.data for result in supervisor_response.results if result.ok}

        return QueryResult(
            request_text=text,
            summary=supervisor_response.summary,
            agent_data=agent_data,
            reasoning=_build_reasoning(supervisor_response),
        )

    def explain(self, *, text: str, params: dict[str, Any] | None = None) -> ExplainResult:
        """Run the Supervisor, then generate an LLM explanation grounded in its output.

        If no ``llm_service`` was configured, *or* the configured one is
        unavailable (Ollama down, timed out, erroring — see
        :func:`_generate_or_degrade`), ``explanation`` is empty and
        ``answer`` falls back to the Supervisor's own aggregated summary
        — the endpoint still returns structured agent data and reasoning
        metadata (with a warning explaining the fallback) rather than
        failing outright.
        """
        supervisor_response = run_supervisor(self._graph, AgentRequest(text=text, params=params or {}))
        context = _build_llm_context(supervisor_response)

        if self._llm_service is None:
            return ExplainResult(
                request_text=text,
                answer=supervisor_response.summary,
                explanation="",
                reasoning=_build_reasoning(supervisor_response),
            )

        llm_response, warnings = _generate_or_degrade(
            self._llm_service, question=text, context=context, domain=_select_domain(supervisor_response)
        )
        if llm_response is None:
            return ExplainResult(
                request_text=text,
                answer=supervisor_response.summary,
                explanation="",
                reasoning=_build_reasoning(supervisor_response, warnings=warnings),
            )
        return ExplainResult(
            request_text=text,
            answer=_append_sources(llm_response.answer, context),
            explanation=llm_response.reasoning,
            reasoning=_build_reasoning(supervisor_response, model=llm_response.model),
        )

    def recommend(self, *, text: str, params: dict[str, Any] | None = None) -> RecommendResult:
        """Run the Supervisor and aggregate every agent's recommendations into one structured list."""
        supervisor_response = run_supervisor(self._graph, AgentRequest(text=text, params=params or {}))

        return RecommendResult(
            request_text=text,
            recommendations=_extract_recommendations(supervisor_response),
            reasoning=_build_reasoning(supervisor_response),
        )

    def summary(self, *, text: str, params: dict[str, Any] | None = None) -> SummaryResult:
        """Run the Supervisor and shape its output into the Response Aggregator's six-section unified response.

        No LLM call — :func:`~src.ai.agents.response_aggregator.aggregate`
        derives every section deterministically from the Supervisor's own
        ``AgentResult`` list, the same objects :meth:`query` returns raw
        and :meth:`recommend` partially reshapes.
        """
        supervisor_response = run_supervisor(self._graph, AgentRequest(text=text, params=params or {}))

        return SummaryResult(
            request_text=text,
            unified=aggregate(list(supervisor_response.results)),
            reasoning=_build_reasoning(supervisor_response),
        )

    def explainability(self, *, text: str, params: dict[str, Any] | None = None) -> ExplainabilityResult:
        """Run the Supervisor and build a structured explainability report from its output.

        No LLM call — :func:`~src.ai.agents.explainability_service.explain`
        derives every section (evidence used, graph relationships,
        retrieved regulations, per-agent contributions, confidence)
        deterministically from the Supervisor's own ``AgentResult`` list.
        Distinct from :meth:`explain`, which generates a natural-language
        answer via the LLM service — this method explains *how* the
        system arrived at its output, not what the answer is.
        """
        supervisor_response = run_supervisor(self._graph, AgentRequest(text=text, params=params or {}))

        return ExplainabilityResult(
            request_text=text,
            report=build_explainability_report(list(supervisor_response.results)),
            reasoning=_build_reasoning(supervisor_response),
        )

    def chat(self, *, message: str, params: dict[str, Any] | None = None) -> ChatResult:
        """Run the Supervisor against the latest message, then generate a conversational reply.

        History beyond the latest message is accepted by the route layer
        for client-side display continuity, but the Supervisor and LLM
        call here operate on ``message`` alone — multi-turn context
        carryover is a future enhancement, not silently faked today.

        If no ``llm_service`` was configured, *or* the configured one is
        unavailable, ``reply`` falls back to the Supervisor's aggregated
        summary (with a warning explaining the fallback), same as
        :meth:`explain` — see :func:`_generate_or_degrade`.
        """
        supervisor_response = run_supervisor(self._graph, AgentRequest(text=message, params=params or {}))
        context = _build_llm_context(supervisor_response)

        if self._llm_service is None:
            return ChatResult(
                reply=supervisor_response.summary,
                explanation="",
                reasoning=_build_reasoning(supervisor_response),
            )

        llm_response, warnings = _generate_or_degrade(
            self._llm_service, question=message, context=context, domain=_select_domain(supervisor_response)
        )
        if llm_response is None:
            return ChatResult(
                reply=supervisor_response.summary,
                explanation="",
                reasoning=_build_reasoning(supervisor_response, warnings=warnings),
            )
        return ChatResult(
            reply=_append_sources(llm_response.answer, context),
            explanation=llm_response.reasoning,
            reasoning=_build_reasoning(supervisor_response, model=llm_response.model),
        )
