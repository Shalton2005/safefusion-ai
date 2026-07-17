"""AI Safety Copilot routes for SafeFusion AI API v1.

Exposes the Copilot operations over a single ``/ai`` namespace, each
backed by :class:`~src.ai.copilot.service.AiCopilotService`, which runs
every request through the LangGraph-compiled AI Supervisor (see
``src/ai/graph/builder.py``):

    - ``POST /ai/query``          — general question -> aggregated structured agent output.
    - ``POST /ai/explain``        — Supervisor output -> LLM-generated, context-grounded explanation.
    - ``POST /ai/recommend``      — Supervisor output -> aggregated recommendations across agents.
    - ``POST /ai/summary``        — Supervisor output -> unified six-section response (no LLM call).
    - ``POST /ai/explainability`` — Supervisor output -> structured "why" report (no LLM call).
    - ``POST /ai/chat``           — conversational reply, grounded the same way as ``/explain``.

Every response includes a ``reasoning`` block (executed agent route,
per-agent summaries/citations, and — for the two LLM-backed endpoints —
which model generated the answer). This route module only translates
between HTTP and :mod:`src.ai.copilot`'s dataclasses; all orchestration
logic (routing, agent execution, LLM grounding) lives there and in
``src.ai``, independent of FastAPI.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from neo4j import Session as GraphSession
from sqlalchemy.orm import Session

from src.ai.agents.factory import build_default_registry
from src.ai.agents.risk_agent import MonitoringEnginePort
from src.ai.agents.routing import KeywordRoutingStrategy, default_keyword_routes
from src.ai.agents.supervisor import Supervisor
from src.ai.config import GraphConfig
from src.ai.agents.explainability_service import (
    AgentContribution,
    EvidenceItem,
    ExplainabilityReport,
    GraphRelationshipItem,
    RegulationReference,
)
from src.ai.agents.response_aggregator import UnifiedResponse, ZoneRiskFinding
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
from src.ai.copilot.service import AiCopilotService
from src.ai.graph.builder import build_graph
from src.ai.llm.config import LlmConfig
from src.ai.llm.ollama_provider import OllamaLlmProvider
from src.ai.llm.service import LlmService
from src.config.risk_rules import (
    COMPOUND_RISK_LEVEL_BANDS,
    COMPOUND_RISK_RULES,
    EMERGENCY_RESPONSE_RULES,
)
from src.config.settings import settings
from src.database.session import get_db
from src.graph_database.session import get_graph_session
from src.models.enums import EmergencyActionType, PermitStatus, SensorType
from src.repositories.document_embedding import DocumentEmbeddingRepository
from src.repositories.graph_query import GraphQueryRepository
from src.repositories.incident import IncidentRepository
from src.repositories.permit import PermitRepository
from src.repositories.sensor import SensorRepository
from src.repositories.worker import WorkerRepository
from src.schemas.request.ai_copilot import (
    AiChatRequest,
    AiExplainabilityRequest,
    AiExplainRequest,
    AiQueryRequest,
    AiRecommendRequest,
    AiSummaryRequest,
)
from src.schemas.response.ai_copilot import (
    AgentContributionResponse,
    AgentTraceResponse,
    AiChatResponse,
    AiExplainabilityResponse,
    AiExplainResponse,
    AiQueryResponse,
    AiRecommendResponse,
    AiSummaryResponse,
    EvidenceItemResponse,
    ExplainabilityReportModel,
    GraphRelationshipItemResponse,
    RecommendationResponse,
    ReasoningMetadataResponse,
    RegulationReferenceResponse,
    UnifiedResponseModel,
    ZoneRiskFindingResponse,
)
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.compound_risk.engine import CompoundRiskEngine
from src.services.compound_risk.rules import (
    CriticalSensorWithoutActivePermitRule,
    CriticalSensorWithWorkerPresentRule,
    ExpiredPermitWithWorkerPresentRule,
    MultipleWarningSensorsRule,
    RestrictedZoneWithoutActivePermitRule,
)
from src.services.compound_risk.schemas import CompoundRiskLevelBands
from src.services.embedding.config import OllamaEmbeddingConfig
from src.services.embedding.ollama_provider import OllamaEmbeddingProvider
from src.services.embedding.service import EmbeddingService
from src.services.emergency_response.emergency_response_service import EmergencyResponseService
from src.services.emergency_response.engine import EmergencyResponseEngine
from src.services.emergency_response.rules import ThresholdEmergencyResponseRule
from src.services.graph_query import GraphQueryService
from src.services.permit_validation import PermitValidationRules, PermitValidationService
from src.services.rag.rag_service import RagService
from src.services.sensor_monitoring import SensorMonitoringService, SensorThresholdBand
from src.services.worker_monitoring import WorkerMonitoringService

router: APIRouter = APIRouter(prefix="/ai", tags=["AI Safety Copilot"])

DbDep = Annotated[Session, Depends(get_db)]
GraphSessionDep = Annotated[GraphSession, Depends(get_graph_session)]

# Maps each centralised emergency rule name to the predefined action it
# dispatches — same table as src.routes.emergency_response, duplicated
# rather than imported since that module's builder is route-private.
_RULE_NAME_TO_ACTION: dict[str, EmergencyActionType] = {
    "notify_safety_officer": EmergencyActionType.NOTIFY_SAFETY_OFFICER,
    "notify_control_room": EmergencyActionType.NOTIFY_CONTROL_ROOM,
    "stop_work": EmergencyActionType.STOP_WORK,
    "isolate_equipment": EmergencyActionType.ISOLATE_EQUIPMENT,
    "evacuate_area": EmergencyActionType.EVACUATE_AREA,
    "generate_incident": EmergencyActionType.GENERATE_INCIDENT,
}


class _MonitoringEngineAdapter:
    """Adapts sensor + worker monitoring services into :class:`MonitoringEnginePort`.

    Those services each expose ``get_monitoring_summary()``; the Risk
    agent's port wants the two split out by name (see
    ``src/ai/agents/risk_agent.py``). Same adapter shape as
    ``src.routes.monitoring._PermitValidationSummaryAdapter``.
    """

    def __init__(self, sensor_service: SensorMonitoringService, worker_service: WorkerMonitoringService) -> None:
        self._sensor_service = sensor_service
        self._worker_service = worker_service

    def get_sensor_summary(self) -> dict:
        return self._sensor_service.get_monitoring_summary()

    def get_worker_summary(self) -> dict:
        return self._worker_service.get_monitoring_summary()


class _PermitValidationSummaryAdapter:
    """Adapts ``PermitValidationService`` + repository into the summary-only port.

    Same shape as ``src.routes.monitoring._PermitValidationSummaryAdapter``
    — duplicated locally since that one is route-private.
    """

    def __init__(self, validation_service: PermitValidationService, repository: PermitRepository) -> None:
        self._validation_service = validation_service
        self._repository = repository

    def get_validation_summary(self) -> dict:
        permits = self._repository.get_all(skip=0, limit=10_000)
        return self._validation_service.build_validation_summary(permits)


def _sensor_thresholds_from_settings() -> dict[SensorType, SensorThresholdBand]:
    return {
        SensorType.GAS: SensorThresholdBand(
            warning_max=settings.SENSOR_GAS_WARNING_MAX, critical_max=settings.SENSOR_GAS_CRITICAL_MAX
        ),
        SensorType.TEMPERATURE: SensorThresholdBand(
            warning_max=settings.SENSOR_TEMPERATURE_WARNING_MAX,
            critical_max=settings.SENSOR_TEMPERATURE_CRITICAL_MAX,
        ),
        SensorType.PRESSURE: SensorThresholdBand(
            warning_max=settings.SENSOR_PRESSURE_WARNING_MAX, critical_max=settings.SENSOR_PRESSURE_CRITICAL_MAX
        ),
        SensorType.HUMIDITY: SensorThresholdBand(
            warning_max=settings.SENSOR_HUMIDITY_WARNING_MAX, critical_max=settings.SENSOR_HUMIDITY_CRITICAL_MAX
        ),
        SensorType.SMOKE: SensorThresholdBand(
            warning_max=settings.SENSOR_SMOKE_WARNING_MAX, critical_max=settings.SENSOR_SMOKE_CRITICAL_MAX
        ),
    }


def _build_compound_risk_engine() -> CompoundRiskEngine:
    """Build the Compound Risk Engine from the centralised rule registry.

    Same construction as ``src.routes.monitoring._build_compound_risk_engine``
    — duplicated locally since that one is route-private.
    """
    rules = COMPOUND_RISK_RULES
    engine_rules: list = [
        CriticalSensorWithoutActivePermitRule(points=rules["critical_sensor_without_active_permit"].points),
        ExpiredPermitWithWorkerPresentRule(points=rules["expired_permit_with_worker_present"].points),
        CriticalSensorWithWorkerPresentRule(points=rules["critical_sensor_with_worker_present"].points),
        RestrictedZoneWithoutActivePermitRule(
            points=rules["restricted_zone_without_active_permit"].points,
            restricted_zones=rules["restricted_zone_without_active_permit"].params["restricted_zones"],
        ),
        MultipleWarningSensorsRule(
            points=rules["multiple_warning_sensors"].points,
            minimum_warning_count=rules["multiple_warning_sensors"].params["minimum_warning_count"],
        ),
    ]
    return CompoundRiskEngine(rules=engine_rules, level_bands=CompoundRiskLevelBands(**COMPOUND_RISK_LEVEL_BANDS))


def _build_emergency_response_engine() -> EmergencyResponseEngine:
    """Build the Emergency Response Engine from the centralised rule registry.

    Same construction as ``src.routes.emergency_response._build_emergency_response_engine``
    — duplicated locally since that one is route-private.
    """
    engine_rules = [
        ThresholdEmergencyResponseRule(
            rule_name=rule_name, action=_RULE_NAME_TO_ACTION[rule_name], threshold=rule.points
        )
        for rule_name, rule in EMERGENCY_RESPONSE_RULES.items()
    ]
    return EmergencyResponseEngine(rules=engine_rules)


def _permit_validation_rules() -> PermitValidationRules:
    return PermitValidationRules(
        valid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_VALID_STATUSES},
        pending_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_PENDING_STATUSES},
        invalid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_INVALID_STATUSES},
        expired_grace_seconds=settings.PERMIT_VALIDATION_EXPIRED_GRACE_SECONDS,
    )


def get_ai_copilot_service(db: DbDep, graph_session: GraphSessionDep) -> AiCopilotService:
    """Wire the full agent registry, Supervisor, LangGraph graph, and LLM service for one request.

    Every dependency here is either request-scoped (DB/Neo4j sessions)
    or cheap to construct (services, engines) — mirrors how
    ``src/routes/monitoring.py`` and ``src/routes/rag.py`` build their
    services per-request rather than reusing a process-wide singleton,
    so each request gets its own DB session lifecycle.
    """
    sensor_service = SensorMonitoringService(
        repository=SensorRepository(db), thresholds=_sensor_thresholds_from_settings()
    )
    worker_service = WorkerMonitoringService(
        worker_repository=WorkerRepository(db), permit_repository=PermitRepository(db)
    )
    monitoring_engine: MonitoringEnginePort = _MonitoringEngineAdapter(sensor_service, worker_service)

    compound_risk_engine = CompoundRiskService(
        engine=_build_compound_risk_engine(),
        sensor_monitoring=sensor_service,
        worker_monitoring=worker_service,
        permit_validation=_PermitValidationSummaryAdapter(
            PermitValidationService(rules=_permit_validation_rules()), PermitRepository(db)
        ),
    )

    embedding_provider = OllamaEmbeddingProvider(
        OllamaEmbeddingConfig(model=settings.OLLAMA_EMBEDDING_MODEL, base_url=settings.OLLAMA_BASE_URL)
    )
    retrieval_engine = RagService(
        repository=DocumentEmbeddingRepository(db), embedder=EmbeddingService(embedding_provider)
    )

    graph_engine = GraphQueryService(repository=GraphQueryRepository(graph_session))

    emergency_engine = EmergencyResponseService(
        engine=_build_emergency_response_engine(), incident_repository=IncidentRepository(db)
    )

    registry = build_default_registry(
        monitoring_engine=monitoring_engine,
        compound_risk_engine=compound_risk_engine,
        retrieval_engine=retrieval_engine,
        knowledge_engine=retrieval_engine,
        graph_engine=graph_engine,
        emergency_engine=emergency_engine,
    )
    supervisor = Supervisor(registry, KeywordRoutingStrategy(default_keyword_routes()))

    graph_config = GraphConfig(model=settings.LANGGRAPH_MODEL, api_key=settings.ANTHROPIC_API_KEY)
    compiled_graph = build_graph(graph_config, supervisor)

    llm_provider = OllamaLlmProvider(
        LlmConfig(
            model=settings.OLLAMA_LLM_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=settings.OLLAMA_LLM_TEMPERATURE,
        )
    )
    llm_service = LlmService(llm_provider)

    return AiCopilotService(compiled_graph, llm_service)


AiCopilotServiceDep = Annotated[AiCopilotService, Depends(get_ai_copilot_service)]


# ── dataclass -> response model translation ─────────────────────────────────


def _reasoning_to_response(reasoning: ReasoningMetadata) -> ReasoningMetadataResponse:
    return ReasoningMetadataResponse(
        route=reasoning.route,
        agent_traces=[_trace_to_response(trace) for trace in reasoning.agent_traces],
        model=reasoning.model,
    )


def _trace_to_response(trace: AgentTrace) -> AgentTraceResponse:
    return AgentTraceResponse(agent=trace.agent, ok=trace.ok, summary=trace.summary, citations=trace.citations, error=trace.error)


def _recommendation_to_response(recommendation: Recommendation) -> RecommendationResponse:
    return RecommendationResponse(source_agent=recommendation.source_agent, text=recommendation.text, zone=recommendation.zone)


def _zone_finding_to_response(finding: ZoneRiskFinding) -> ZoneRiskFindingResponse:
    return ZoneRiskFindingResponse(
        zone=finding.zone,
        risk_level=finding.risk_level,
        risk_score=finding.risk_score,
        hazards=finding.hazards,
        reasoning=finding.reasoning,
    )


def _unified_to_response(unified: UnifiedResponse) -> UnifiedResponseModel:
    return UnifiedResponseModel(
        executive_summary=unified.executive_summary,
        risk_assessment=[_zone_finding_to_response(finding) for finding in unified.risk_assessment],
        supporting_evidence=unified.supporting_evidence,
        regulatory_references=unified.regulatory_references,
        recommended_actions=unified.recommended_actions,
        confidence_score=unified.confidence_score,
        agent_errors=unified.agent_errors,
    )


def _evidence_to_response(item: EvidenceItem) -> EvidenceItemResponse:
    return EvidenceItemResponse(source_agent=item.source_agent, content=item.content, origin=item.origin)


def _graph_relationship_to_response(item: GraphRelationshipItem) -> GraphRelationshipItemResponse:
    return GraphRelationshipItemResponse(category=item.category, query=item.query, record=item.record)


def _regulation_to_response(item: RegulationReference) -> RegulationReferenceResponse:
    return RegulationReferenceResponse(regulation=item.regulation, section=item.section)


def _contribution_to_response(item: AgentContribution) -> AgentContributionResponse:
    return AgentContributionResponse(
        agent=item.agent, ok=item.ok, summary=item.summary, weight=item.weight, citations=item.citations, error=item.error
    )


def _report_to_response(report: ExplainabilityReport) -> ExplainabilityReportModel:
    return ExplainabilityReportModel(
        summary=report.summary,
        evidence_used=[_evidence_to_response(item) for item in report.evidence_used],
        graph_relationships=[_graph_relationship_to_response(item) for item in report.graph_relationships],
        retrieved_regulations=[_regulation_to_response(item) for item in report.retrieved_regulations],
        agent_contributions=[_contribution_to_response(item) for item in report.agent_contributions],
        confidence=report.confidence,
    )


# ── routes ────────────────────────────────────────────────────────────────────


@router.post(
    "/query",
    summary="Run the AI Supervisor and return aggregated structured agent output",
    description=(
        "Routes the request through the LangGraph AI Supervisor to whichever "
        "specialized agents (Risk, Compliance, Knowledge, Graph Knowledge, "
        "Emergency) it selects, executes them in sequence, and returns each "
        "agent's structured output keyed by agent name, plus reasoning "
        "metadata (executed route, per-agent summaries/citations)."
    ),
    response_model=AiQueryResponse,
    response_description="Aggregated structured output from every agent the Supervisor executed.",
)
def query(payload: AiQueryRequest, service: AiCopilotServiceDep) -> AiQueryResponse:
    result: QueryResult = service.query(text=payload.text, params=payload.params)
    return AiQueryResponse(
        request_text=result.request_text,
        summary=result.summary,
        agent_data=result.agent_data,
        reasoning=_reasoning_to_response(result.reasoning),
    )


@router.post(
    "/explain",
    summary="Generate an explainable, context-grounded answer via the AI Supervisor + LLM",
    description=(
        "Routes the request through the AI Supervisor, then generates a "
        "natural-language answer and explanation via the Ollama-backed LLM "
        "service, grounded strictly in the Supervisor's agent output "
        "(RAG, knowledge graph, and/or Risk Engine context — see "
        "src/ai/llm). Reasoning metadata includes both the executed agent "
        "route and the model used for generation."
    ),
    response_model=AiExplainResponse,
    response_description="Explainable answer with separated reasoning.",
)
def explain(payload: AiExplainRequest, service: AiCopilotServiceDep) -> AiExplainResponse:
    result: ExplainResult = service.explain(text=payload.text, params=payload.params)
    return AiExplainResponse(
        request_text=result.request_text,
        answer=result.answer,
        explanation=result.explanation,
        reasoning=_reasoning_to_response(result.reasoning),
    )


@router.post(
    "/recommend",
    summary="Aggregate recommendations across every agent the AI Supervisor executed",
    description=(
        "Routes the request through the AI Supervisor and collects "
        "structured recommendations from whichever agents produced them "
        "(Risk, Compliance, Emergency), each tagged with its source agent "
        "and zone where applicable. No LLM call — recommendations are the "
        "agents' own deterministic output, not generated text."
    ),
    response_model=AiRecommendResponse,
    response_description="Recommendations aggregated across agents, with reasoning metadata.",
)
def recommend(payload: AiRecommendRequest, service: AiCopilotServiceDep) -> AiRecommendResponse:
    result: RecommendResult = service.recommend(text=payload.text, params=payload.params)
    return AiRecommendResponse(
        request_text=result.request_text,
        recommendations=[_recommendation_to_response(item) for item in result.recommendations],
        reasoning=_reasoning_to_response(result.reasoning),
    )


@router.post(
    "/summary",
    summary="Run the AI Supervisor and return a unified six-section response",
    description=(
        "Routes the request through the AI Supervisor, then combines the "
        "Risk, Compliance, Knowledge, and Emergency agents' output into one "
        "unified response: Executive Summary, Risk Assessment, Supporting "
        "Evidence, Regulatory References, Recommended Actions, and a "
        "Confidence Score. No LLM call — every section is derived "
        "deterministically from the agents' own structured output (see "
        "src/ai/agents/response_aggregator.py)."
    ),
    response_model=AiSummaryResponse,
    response_description="Unified six-section response aggregated across agents.",
)
def summary(payload: AiSummaryRequest, service: AiCopilotServiceDep) -> AiSummaryResponse:
    result: SummaryResult = service.summary(text=payload.text, params=payload.params)
    return AiSummaryResponse(
        request_text=result.request_text,
        unified=_unified_to_response(result.unified),
        reasoning=_reasoning_to_response(result.reasoning),
    )


@router.post(
    "/explainability",
    summary="Run the AI Supervisor and return a structured explainability report",
    description=(
        "Routes the request through the AI Supervisor, then builds a "
        "structured, auditable explanation of how the response was "
        "produced: Summary, Evidence Used, Graph Relationships, Retrieved "
        "Regulations, Agent Contributions, and a Confidence score. No LLM "
        "call — every field is derived deterministically from the agents' "
        "own structured output (see src/ai/agents/explainability_service.py). "
        "Distinct from `POST /ai/explain`, which generates a natural-language "
        "answer via the LLM; this endpoint explains *how* the system "
        "arrived at its output, not what the answer to the question is."
    ),
    response_model=AiExplainabilityResponse,
    response_description="Structured explainability report, JSON-serializable as-is.",
)
def explainability(payload: AiExplainabilityRequest, service: AiCopilotServiceDep) -> AiExplainabilityResponse:
    result: ExplainabilityResult = service.explainability(text=payload.text, params=payload.params)
    return AiExplainabilityResponse(
        request_text=result.request_text,
        report=_report_to_response(result.report),
        reasoning=_reasoning_to_response(result.reasoning),
    )


@router.post(
    "/chat",
    summary="Conversational reply grounded in the AI Supervisor's agent output",
    description=(
        "Routes the latest chat message through the AI Supervisor, then "
        "generates a conversational reply via the LLM service, grounded in "
        "the Supervisor's agent output. `history` is accepted for "
        "client-side display continuity; the Supervisor and LLM call "
        "operate on `message` alone today."
    ),
    response_model=AiChatResponse,
    response_description="Conversational reply with separated reasoning.",
)
def chat(payload: AiChatRequest, service: AiCopilotServiceDep) -> AiChatResponse:
    result: ChatResult = service.chat(message=payload.message, params=payload.params)
    return AiChatResponse(
        reply=result.reply,
        explanation=result.explanation,
        reasoning=_reasoning_to_response(result.reasoning),
    )
