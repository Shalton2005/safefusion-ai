"""Routing strategy — decides which agents a request needs, in what order.

This is the piece that must stay swappable rather than hardcoded: the
supervisor depends on :class:`RoutingStrategy` (a Protocol), never on a
concrete routing implementation. :class:`KeywordRoutingStrategy` is the
default — a small, dependency-free heuristic that inspects the request
text against each agent's declared trigger keywords. Once an LLM-backed
router is wanted (e.g. asking the configured Anthropic model to pick
agents), it plugs in as another ``RoutingStrategy`` implementation with
no change to :mod:`src.ai.agents.supervisor` or :mod:`src.ai.graph.builder`.

Extensibility contract: neither the router protocol nor the supervisor
enumerates agent names anywhere. ``KeywordRoutingStrategy`` is
configured with a mapping the caller supplies — new agents are picked
up by adding an entry to that mapping (or via
:func:`default_keyword_routes`, which reads it off the registry's
declared keywords rather than a fixed literal).
"""

from __future__ import annotations

from typing import Protocol

from src.ai.agents.registry import AgentRegistry


class RoutingStrategy(Protocol):
    """Contract for deciding which agents to run, and in what order."""

    def route(self, text: str, registry: AgentRegistry) -> list[str]: ...


class KeywordRoutingStrategy:
    """Default, dependency-free router: keyword match against declared triggers.

    Args:
        keywords_by_agent: Maps agent name -> keywords/phrases that
            indicate this agent is relevant, checked case-insensitively
            as substrings of the request text. Order of the mapping is
            the tie-break order when multiple agents match — callers
            that want a specific sequencing (e.g. "risk before
            emergency" so emergency response sees risk's output) should
            order this mapping accordingly.
        fallback: Agent name(s) to run when no keyword matches. Defaults
            to the Knowledge agent — a request the router can't
            classify is treated as a general lookup question.
    """

    def __init__(
        self,
        keywords_by_agent: dict[str, tuple[str, ...]],
        fallback: tuple[str, ...] = ("knowledge",),
    ) -> None:
        self._keywords_by_agent = keywords_by_agent
        self._fallback = fallback

    def route(self, text: str, registry: AgentRegistry) -> list[str]:
        lowered = text.lower()
        matched = [
            name
            for name, keywords in self._keywords_by_agent.items()
            if name in registry and any(keyword in lowered for keyword in keywords)
        ]
        if matched:
            return matched
        return [name for name in self._fallback if name in registry]


def default_keyword_routes() -> dict[str, tuple[str, ...]]:
    """Keyword table for the built-in agents.

    A plain function (not a module-level constant baked into
    :class:`KeywordRoutingStrategy`) so a caller can start from this
    default and extend it with a new agent's keywords rather than
    reimplementing the whole mapping:

    >>> routes = default_keyword_routes()
    >>> routes["detection"] = ("ppe", "camera", "detect")
    >>> strategy = KeywordRoutingStrategy(routes)
    """
    return {
        "risk": ("risk", "hazard", "danger", "score", "unsafe"),
        "compliance": ("compliance", "regulation", "violation", "factory act", "oisd", "dgms"),
        "emergency": ("emergency", "evacuate", "evacuation", "critical", "urgent", "dispatch"),
        "graph_knowledge": ("relationship", "connected to", "related to", "graph", "who is assigned", "history of"),
        "knowledge": ("what is", "explain", "documentation", "policy", "procedure", "how do"),
    }
