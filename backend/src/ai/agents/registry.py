"""Agent registry — the single extension point for adding new agents.

Adding a new specialized agent means writing a class that implements
:class:`~src.ai.agents.base.AgentPort` and calling
:meth:`AgentRegistry.register` for it (typically in whatever composes
the supervisor for a given deployment — see
``src/ai/agents/supervisor.py`` for how the default registry is built).
No graph node, routing table, or supervisor code changes are required
for the new agent to become reachable — only the routing strategy needs
to know the agent's name is a valid target, and the default strategy
(``src/ai/agents/routing.py``) computes that from the registry itself.
"""

from __future__ import annotations

from src.ai.agents.base import AgentPort


class AgentRegistry:
    """Name -> agent lookup table.

    Deliberately a thin wrapper around a dict rather than a global
    singleton: the supervisor takes a registry instance as a
    constructor argument, so tests and alternate deployments can build
    a registry with a different agent set (a subset, fakes, or extra
    agents) without touching supervisor code.
    """

    def __init__(self) -> None:
        self._agents: dict[str, AgentPort] = {}

    def register(self, agent: AgentPort) -> None:
        """Register ``agent`` under its own ``.name``. Overwrites any prior registration with the same name."""
        self._agents[agent.name] = agent

    def get(self, name: str) -> AgentPort | None:
        return self._agents.get(name)

    def names(self) -> tuple[str, ...]:
        """Every registered agent name, in registration order."""
        return tuple(self._agents.keys())

    def __contains__(self, name: str) -> bool:
        return name in self._agents

    def __len__(self) -> int:
        return len(self._agents)
