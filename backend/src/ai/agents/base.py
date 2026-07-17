"""Core contracts shared by every specialized agent and the supervisor.

Every agent — current (``RiskAgent``, ``ComplianceAgent``,
``KnowledgeAgent``, ``EmergencyAgent``) and future — implements
:class:`AgentPort`. The supervisor (``src/ai/agents/supervisor.py``)
never imports a concrete agent class; it only knows this Protocol plus
whatever name the :class:`~src.ai.agents.registry.AgentRegistry` gives
it. That's what keeps adding a new agent a registration, not a code
change to the routing/execution path.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class AgentRequest:
    """The user request handed to the supervisor and, in turn, to each agent.

    Attributes:
        text: Raw user request text (natural language).
        params: Optional structured parameters a caller already knows
            (e.g. ``{"zone": "Boiler-Area"}``) that agents may use
            instead of parsing them out of ``text``. Entirely optional —
            every agent must work from ``text`` alone if empty.
    """

    text: str
    params: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class AgentResult:
    """Structured output every agent must return.

    Uniform shape regardless of which agent produced it, so the
    supervisor can aggregate a list of these without knowing each
    agent's internal result type.

    Attributes:
        agent: Registry name of the agent that produced this result
            (e.g. ``"risk"``). Set by the supervisor, not the agent
            itself, so a misconfigured agent can't misreport its own name.
        summary: Human-readable, one-to-a-few-sentence description of
            what this agent found — what a caller reads first.
        data: Structured payload specific to this agent (e.g. a list of
            zone risk scores). Opaque to the supervisor.
        citations: Supporting references (e.g. RAG chunk ids/sources,
            compliance rule codes). Empty tuple if not applicable.
        error: Set instead of ``summary``/``data`` if the agent failed.
            The supervisor still aggregates a failed result — one
            agent's failure never aborts the others.
    """

    agent: str
    summary: str
    data: Any = None
    citations: tuple[str, ...] = field(default_factory=tuple)
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.error is None


class AgentPort(Protocol):
    """Contract every specialized agent implements.

    ``name`` is the stable identifier used for routing and for
    :class:`AgentResult.agent` — it must match the key the agent is
    registered under in :class:`~src.ai.agents.registry.AgentRegistry`.
    """

    @property
    def name(self) -> str: ...

    def run(self, request: AgentRequest) -> AgentResult: ...
