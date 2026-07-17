"""Conversation store — the swappable persistence seam for conversation memory.

:class:`ConversationStorePort` is the narrow contract
:class:`~src.ai.memory.service.ConversationMemoryService` depends on —
the same "depend on a Protocol, not a concrete class" seam every agent
in :mod:`src.ai.agents` uses for its engine (see
``src.ai.agents.risk_agent.MonitoringEnginePort`` for the reference
shape). :class:`InMemoryConversationStore` is today's only
implementation: a process-local dict of deques, gone on restart.

Prepared for persistence: a future ``PostgresConversationStore`` (or
Redis, etc.) implements this same three-method Protocol — construct it
over a repository following this codebase's
:class:`~src.repositories.base.BaseRepository` pattern, keyed by
``conversation_id`` instead of an in-memory dict — and
``ConversationMemoryService`` needs no change at all to use it. No
FastAPI import anywhere in this module.
"""

from __future__ import annotations

from collections import defaultdict, deque
from typing import Protocol

from src.ai.memory.schemas import ConversationTurn


class ConversationStorePort(Protocol):
    """Contract required from a conversation turn store."""

    def append(self, conversation_id: str, turn: ConversationTurn, *, max_turns: int) -> None:
        """Record ``turn`` for ``conversation_id``, trimming to the oldest ``max_turns`` if needed."""
        ...

    def recent(self, conversation_id: str, *, limit: int | None = None) -> tuple[ConversationTurn, ...]:
        """Return stored turns for ``conversation_id``, oldest first, most recent ``limit`` if given."""
        ...

    def clear(self, conversation_id: str) -> None:
        """Discard all stored turns for ``conversation_id``."""
        ...


class InMemoryConversationStore:
    """Process-local conversation store — the default, no-dependency implementation.

    Each conversation's turns live in their own :class:`collections.deque`
    bounded at construction-independent ``max_turns`` (passed per
    :meth:`append` call rather than fixed at construction, so
    :class:`~src.ai.memory.service.ConversationMemoryService`'s
    configurable memory length stays the single source of truth for the
    bound — this store doesn't duplicate that config).

    Not persisted, not shared across processes, not thread-safe beyond
    what a single ASGI worker's GIL already gives you — acceptable for a
    first implementation behind :class:`ConversationStorePort`; swapping
    in a real persistence layer later touches only construction, not
    :class:`~src.ai.memory.service.ConversationMemoryService`.
    """

    def __init__(self) -> None:
        self._conversations: dict[str, deque[ConversationTurn]] = defaultdict(lambda: deque(maxlen=None))

    def append(self, conversation_id: str, turn: ConversationTurn, *, max_turns: int) -> None:
        turns = self._conversations[conversation_id]
        if turns.maxlen != max_turns:
            # maxlen is fixed at deque construction; rebuild if the
            # configured length changed since this conversation's deque
            # was first created (e.g. settings reloaded between requests).
            turns = deque(turns, maxlen=max_turns)
            self._conversations[conversation_id] = turns
        turns.append(turn)

    def recent(self, conversation_id: str, *, limit: int | None = None) -> tuple[ConversationTurn, ...]:
        turns = tuple(self._conversations.get(conversation_id, ()))
        if limit is None or limit >= len(turns):
            return turns
        return turns[-limit:]

    def clear(self, conversation_id: str) -> None:
        self._conversations.pop(conversation_id, None)
