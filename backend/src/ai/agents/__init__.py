"""Specialized agents for the SafeFusion AI LangGraph workflow.

Public surface:
    - :class:`~src.ai.agents.base.AgentPort` / :class:`~src.ai.agents.base.AgentRequest` /
      :class:`~src.ai.agents.base.AgentResult` — the contract every agent implements.
    - :class:`~src.ai.agents.registry.AgentRegistry` — name -> agent lookup; the
      extension point for adding new agents.
    - :class:`~src.ai.agents.routing.RoutingStrategy` /
      :class:`~src.ai.agents.routing.KeywordRoutingStrategy` — decides which
      agents a request needs, without the supervisor hardcoding a routing table.
    - :class:`~src.ai.agents.supervisor.Supervisor` / :class:`~src.ai.agents.supervisor.SupervisorResponse` —
      routes, executes agents in sequence, and aggregates results.
    - :func:`~src.ai.agents.factory.build_default_registry` — wires the
      built-in agents (Risk, Compliance, Knowledge, Graph Knowledge, Emergency).

Each built-in agent (``risk_agent.py``, ``compliance_agent.py``,
``knowledge_agent.py``, ``graph_knowledge_agent.py``,
``emergency_agent.py``) is a thin adapter over an existing
``src.services.*`` engine, reached through a narrow Protocol port —
never a hardcoded import of the concrete service class — so agents stay
unit-testable with fakes and swappable without touching the supervisor
or graph. ``compliance_agent.py`` and ``knowledge_agent.py`` both
consume the RAG Retrieval Service (:class:`~src.services.rag.rag_service.RagService`)
— retrieval only, no LLM call — with different output contracts
tailored to each agent's purpose. ``graph_knowledge_agent.py`` consumes
the Neo4j-backed :class:`~src.services.graph_query.GraphQueryService`,
keeping graph querying (delegated entirely to that service) separate
from the categorization logic that groups results into worker/
equipment/zone/incident relationships. ``emergency_agent.py`` similarly
delegates all action-categorization logic to the standalone
``emergency_categorization.py`` module, keeping the agent itself limited
to request/response glue over the Emergency Response Engine.
"""

from src.ai.agents.base import AgentPort, AgentRequest, AgentResult
from src.ai.agents.factory import build_default_registry
from src.ai.agents.registry import AgentRegistry
from src.ai.agents.routing import KeywordRoutingStrategy, RoutingStrategy, default_keyword_routes
from src.ai.agents.supervisor import Supervisor, SupervisorResponse


__all__ = [
    "AgentPort",
    "AgentRequest",
    "AgentResult",
    "AgentRegistry",
    "RoutingStrategy",
    "KeywordRoutingStrategy",
    "default_keyword_routes",
    "Supervisor",
    "SupervisorResponse",
    "build_default_registry",
]
