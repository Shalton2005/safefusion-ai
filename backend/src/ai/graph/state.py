"""Shared state contract for SafeFusion AI's LangGraph workflow.

One state shape is reused across every node and, eventually, every
specialized agent (see ``src/ai/agents``) so nodes can be composed and
reordered without renegotiating field names. Extend this — don't
replace it — as agents are added: prefer adding an optional field over
introducing a parallel state type.
"""

from __future__ import annotations

from typing import Annotated, Any, TypedDict

from langgraph.graph.message import add_messages


class GraphState(TypedDict, total=False):
    """State object threaded through every node in the workflow graph.

    Attributes:
        messages: Conversation history. The ``add_messages`` reducer
            appends rather than overwrites, so nodes can add to the
            conversation without needing the full prior list.
        context: Free-form scratch space for retrieved context, tool
            results, or intermediate data a node wants to hand to a
            later node (e.g. RAG chunks, sensor snapshots). Keyed by
            producer so agents don't collide on field names.
        route: Optional hint set by a routing/coordinator node to steer
            conditional edges toward a specific specialized agent.
    """

    messages: Annotated[list[Any], add_messages]
    context: dict[str, Any]
    route: str | None
