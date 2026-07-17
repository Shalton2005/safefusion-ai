"""Reusable LangGraph workflow factory for SafeFusion AI.

``build_graph`` assembles a :class:`~langgraph.graph.StateGraph` over the
shared :class:`~src.ai.graph.state.GraphState` contract and compiles it.
It takes no FastAPI dependencies — callers (routes, background workers,
scripts, tests) construct a :class:`~src.ai.config.GraphConfig` and pass
it in, keeping this module importable and testable in isolation.

The graph currently wires a single passthrough node (see
``src/ai/graph/nodes.py``). Specialized agents attach as additional
nodes/edges on top of this scaffold — see ``src/ai/agents`` for where
that logic belongs once implemented.
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from src.ai.config import GraphConfig
from src.ai.graph.nodes import passthrough_node
from src.ai.graph.state import GraphState

_ENTRY_NODE = "entry"


def build_graph(config: GraphConfig) -> CompiledStateGraph:
    """Construct and compile the SafeFusion AI workflow graph.

    Args:
        config: Model/runtime configuration. Not yet consumed by any
            node (there are none with LLM calls), but accepted now so
            the signature doesn't change once agent nodes are added.

    Returns:
        A compiled, invokable LangGraph graph over :class:`GraphState`.
    """
    del config  # unused until a node needs it; kept in the signature deliberately

    graph = StateGraph(GraphState)
    graph.add_node(_ENTRY_NODE, passthrough_node)
    graph.add_edge(START, _ENTRY_NODE)
    graph.add_edge(_ENTRY_NODE, END)

    return graph.compile()


_compiled_graph_cache: CompiledStateGraph | None = None


def get_compiled_graph(config: GraphConfig) -> CompiledStateGraph:
    """Return a process-wide cached compiled graph, building it on first call.

    Compiling a graph is cheap today (one node), but this seam avoids
    rebuilding the graph on every request once nodes carry real setup
    cost (e.g. binding tools to an LLM client). Not thread-safe against
    concurrent first calls with different configs — callers that need
    multiple distinct configs per process should call
    :func:`build_graph` directly instead.
    """
    global _compiled_graph_cache
    if _compiled_graph_cache is None:
        _compiled_graph_cache = build_graph(config)
    return _compiled_graph_cache
