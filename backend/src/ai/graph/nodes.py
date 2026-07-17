"""Node implementations for the SafeFusion AI LangGraph workflow.

Two nodes:
    - :func:`passthrough_node` — zero-dependency default so the graph is
      runnable with no agents configured (e.g. in tests of the graph
      shape alone).
    - :func:`make_supervisor_node` — builds the real entry node,
      delegating to :class:`~src.ai.agents.supervisor.Supervisor` for
      routing, sequential agent execution, and aggregation. The node
      function itself contains no orchestration logic; it only adapts
      between :class:`~src.ai.graph.state.GraphState` and the
      supervisor's :class:`~src.ai.agents.base.AgentRequest` /
      :class:`~src.ai.agents.base.SupervisorResponse` types.
"""

from __future__ import annotations

from typing import Callable

from src.ai.agents.base import AgentRequest
from src.ai.agents.supervisor import Supervisor
from src.ai.graph.state import GraphState


def passthrough_node(state: GraphState) -> GraphState:
    """No-op node that returns state unchanged.

    Default entry node when :func:`~src.ai.graph.builder.build_graph`
    is called without a :class:`Supervisor` — keeps the graph runnable
    with zero agent wiring for shape-only tests.
    """
    return state


def make_supervisor_node(supervisor: Supervisor) -> Callable[[GraphState], GraphState]:
    """Build the graph node that runs ``supervisor`` against the latest user message.

    Reads the most recent ``human``/``user`` message out of
    ``state["messages"]`` as the request text (LangGraph's
    ``add_messages`` reducer accepts plain strings, dicts, or
    ``BaseMessage`` instances — this reads whichever shape is present).
    Writes the :class:`~src.ai.agents.supervisor.SupervisorResponse`
    into ``state["context"]["supervisor_response"]`` rather than
    replacing ``messages``, so downstream nodes/callers can inspect the
    full structured result (route, per-agent results, aggregated
    summary) without re-parsing a text blob.
    """

    def supervisor_node(state: GraphState) -> GraphState:
        request_text = _latest_request_text(state)
        response = supervisor.handle(AgentRequest(text=request_text))

        context = dict(state.get("context") or {})
        context["supervisor_response"] = response

        return {
            "messages": [{"role": "assistant", "content": response.summary}],
            "context": context,
            "route": ",".join(response.route) or None,
        }

    return supervisor_node


def _latest_request_text(state: GraphState) -> str:
    """Extract the most recent human/user message text from graph state."""
    messages = state.get("messages") or []
    for message in reversed(messages):
        role, content = _message_role_and_content(message)
        if role in ("human", "user"):
            return content
    return ""


def _message_role_and_content(message: object) -> tuple[str, str]:
    """Normalize a message entry (dict, LangChain ``BaseMessage``, or plain str) to (role, content)."""
    if isinstance(message, str):
        return "human", message
    if isinstance(message, dict):
        return str(message.get("role", "")), str(message.get("content", ""))
    role = getattr(message, "type", None) or getattr(message, "role", "")
    content = getattr(message, "content", "")
    return str(role), str(content)
