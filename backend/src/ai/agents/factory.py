"""Default agent registry factory.

Wires the built-in specialized agents (:class:`~src.ai.agents.risk_agent.RiskAgent`,
:class:`~src.ai.agents.compliance_agent.ComplianceAgent`,
:class:`~src.ai.agents.knowledge_agent.KnowledgeAgent`,
:class:`~src.ai.agents.graph_knowledge_agent.GraphKnowledgeAgent`,
:class:`~src.ai.agents.emergency_agent.EmergencyAgent`) to an
:class:`~src.ai.agents.registry.AgentRegistry`, given already-constructed
concrete engines. This module is the one place that knows about the
concrete ``src.services.*`` classes — everything else in ``src.ai``
depends only on the narrow ``*EnginePort`` Protocols each agent
declares, per the pattern in ``src/ai/agents/base.py``.

Callers (a FastAPI route dependency, a script, a test) that want a
different agent set — a subset, extra agents, fakes — build their own
:class:`~src.ai.agents.registry.AgentRegistry` directly instead of
calling this factory; nothing here is required to use the supervisor.
"""

from __future__ import annotations

from src.ai.agents.compliance_agent import ComplianceAgent, RetrievalPort
from src.ai.agents.emergency_agent import EmergencyAgent, EmergencyEnginePort
from src.ai.agents.graph_knowledge_agent import GraphKnowledgeAgent, GraphKnowledgePort
from src.ai.agents.knowledge_agent import KnowledgeAgent, KnowledgeEnginePort
from src.ai.agents.registry import AgentRegistry
from src.ai.agents.risk_agent import CompoundRiskEnginePort, MonitoringEnginePort, RiskAgent


def build_default_registry(
    *,
    monitoring_engine: MonitoringEnginePort,
    compound_risk_engine: CompoundRiskEnginePort,
    retrieval_engine: RetrievalPort,
    knowledge_engine: KnowledgeEnginePort,
    graph_engine: GraphKnowledgePort,
    emergency_engine: EmergencyEnginePort,
) -> AgentRegistry:
    """Build the standard agent registry from already-constructed engines.

    Each ``*_engine`` argument is expected to already satisfy the
    matching agent's narrow Protocol (e.g. ``compound_risk_engine`` is
    typically a :class:`~src.services.compound_risk.compound_risk_service.CompoundRiskService`
    instance) — this factory does not construct services or touch the
    database itself; that wiring belongs to the caller (a FastAPI route
    dependency), keeping ``src.ai`` free of DB/HTTP concerns.

    ``retrieval_engine`` and ``knowledge_engine`` are typically the same
    :class:`~src.services.rag.rag_service.RagService` instance passed
    twice — Compliance and Knowledge are separate agents with separate
    output contracts, but both consume the one Retrieval Service.
    ``graph_engine`` is typically a
    :class:`~src.services.graph_query.GraphQueryService` instance.
    """
    registry = AgentRegistry()
    registry.register(RiskAgent(monitoring_engine, compound_risk_engine))
    registry.register(ComplianceAgent(retrieval_engine))
    registry.register(KnowledgeAgent(knowledge_engine))
    registry.register(GraphKnowledgeAgent(graph_engine))
    registry.register(EmergencyAgent(emergency_engine))
    return registry
