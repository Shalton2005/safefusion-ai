"""Node implementations for the SafeFusion AI LangGraph workflow.

Intentionally minimal: only a passthrough placeholder node exists so the
graph is runnable end-to-end before any agent logic is written. Specialized
agents (hazard detection, incident analysis, compliance, etc. — see
``src/ai/agents``) plug in here as additional node functions once built;
each should take and return a :class:`~src.ai.graph.state.GraphState`.
"""

from __future__ import annotations

from src.ai.graph.state import GraphState


def passthrough_node(state: GraphState) -> GraphState:
    """No-op node that returns state unchanged.

    Placeholder wired into the default graph (see
    ``src/ai/graph/builder.py``) so the workflow has at least one node
    and is runnable before real agent nodes exist. Replace or remove
    once the first specialized agent node is added.
    """
    return state
