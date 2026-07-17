"""Structured contract for one remembered conversation turn.

Reuses the same context-item shapes :mod:`src.ai.llm.context` already
defines for LLM grounding (:class:`~src.ai.llm.context.RagContextItem`,
:class:`~src.ai.llm.context.GraphContextItem`) rather than inventing a
parallel "retrieved context" / "graph entity" representation — a
remembered turn's retrieved context is drawn from the exact same
Knowledge/Compliance agent output an LLM call would have been grounded
in, and its referenced graph entities are the exact same
:class:`~src.ai.agents.graph_knowledge_agent.GraphRelationship` records
the Graph Knowledge agent returns. One shape, two consumers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from src.ai.llm.context import GraphContextItem, RagContextItem


@dataclass(frozen=True, slots=True)
class ConversationTurn:
    """One remembered exchange: what the user asked, what came back, and why.

    Attributes:
        query: The user's query text for this turn.
        response: The AI's response text for this turn (an LLM-generated
            answer, or a deterministic summary — this module doesn't
            care which produced it).
        retrieved_context: RAG passages (Knowledge/Compliance agent
            output) that grounded ``response``, if any.
        referenced_entities: Knowledge-graph relationship records
            (Graph Knowledge agent output) that grounded ``response``,
            if any.
        timestamp: When the turn was recorded. Defaults to UTC now —
            callers that need deterministic timestamps (tests, replay)
            pass one explicitly.
    """

    query: str
    response: str
    retrieved_context: tuple[RagContextItem, ...] = field(default_factory=tuple)
    referenced_entities: tuple[GraphContextItem, ...] = field(default_factory=tuple)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
