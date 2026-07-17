"""Reusable LangGraph workflow factory for SafeFusion AI.

``build_graph`` assembles a :class:`~langgraph.graph.StateGraph` over the
shared :class:`~src.ai.graph.state.GraphState` contract and compiles it.
It takes no FastAPI dependencies — callers (routes, background workers,
scripts, tests) construct a :class:`~src.ai.config.GraphConfig` and pass
it in, keeping this module importable and testable in isolation.

The graph's entry node is the AI Supervisor (see
``src/ai/agents/supervisor.py``): it receives the user request, routes
to whichever specialized agents (Risk, Compliance, Knowledge, Emergency,
or any future agent registered in an
:class:`~src.ai.agents.registry.AgentRegistry`) the configured routing
strategy selects, executes them in sequence, and aggregates their
results into the graph state. Passing no ``supervisor`` falls back to a
no-op passthrough node so the graph shape is testable without wiring
any agents.
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from src.ai.agents.supervisor import Supervisor
from src.ai.config import GraphConfig
from src.ai.graph.nodes import make_supervisor_node, passthrough_node
from src.ai.graph.state import GraphState

_ENTRY_NODE = "supervisor"


def build_graph(config: GraphConfig, supervisor: Supervisor | None = None) -> CompiledStateGraph:
    """Construct and compile the SafeFusion AI workflow graph.

    Args:
        config: Model/runtime configuration. Not yet consumed directly
            by any node (agents currently call into deterministic
            ``src.services.*`` engines, not the LLM), but accepted now
            so the signature doesn't change once an LLM-backed node or
            routing strategy is added.
        supervisor: Coordinates the specialized agents. If omitted, the
            graph runs a no-op passthrough node instead — useful for
            testing the graph's shape/wiring without constructing any
            agents.

    Returns:
        A compiled, invokable LangGraph graph over :class:`GraphState`.
    """
    del config  # unused until a node needs it; kept in the signature deliberately

    graph = StateGraph(GraphState)
    entry_node = make_supervisor_node(supervisor) if supervisor is not None else passthrough_node
    graph.add_node(_ENTRY_NODE, entry_node)
    graph.add_edge(START, _ENTRY_NODE)
    graph.add_edge(_ENTRY_NODE, END)

    return graph.compile()


_compiled_graph_cache: CompiledStateGraph | None = None


def get_compiled_graph(config: GraphConfig, supervisor: Supervisor | None = None) -> CompiledStateGraph:
    """Return a process-wide cached compiled graph, building it on first call.

    Compiling a graph is cheap today, but this seam avoids rebuilding
    the graph on every request once nodes carry real setup cost (e.g.
    binding tools to an LLM client). Not thread-safe against concurrent
    first calls with different configs/supervisors — callers that need
    multiple distinct configurations per process should call
    :func:`build_graph` directly instead.
    """
    global _compiled_graph_cache
    if _compiled_graph_cache is None:
        _compiled_graph_cache = build_graph(config, supervisor)
    return _compiled_graph_cache
