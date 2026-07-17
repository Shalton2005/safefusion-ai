"""Conversation Memory Service — lightweight recall of recent Copilot turns.

Sits alongside :class:`~src.ai.copilot.service.AiCopilotService` rather
than inside it: ``AiCopilotService.chat`` accepts client-supplied
``history`` today but never persists or recalls anything server-side
(see that module's docstring). This service is the seam for a future
"remember what we discussed" capability — record a turn after each
response, recall recent turns before the next one — without coupling
memory storage to Copilot's request/response plumbing.

Modularity: all storage goes through :class:`~src.ai.memory.store.ConversationStorePort`,
never a concrete store, so swapping :class:`~src.ai.memory.store.InMemoryConversationStore`
for a persisted implementation later is a constructor argument change,
not a rewrite of this service. Memory length is configurable per
instance (``max_turns``) with a per-call override, following the same
"configurable, not hardcoded" rule as
:class:`~src.ai.agents.routing.KeywordRoutingStrategy`'s keyword table.

No LLM call, no FastAPI import.
"""

from __future__ import annotations

from src.ai.memory.schemas import ConversationTurn
from src.ai.memory.store import ConversationStorePort, InMemoryConversationStore


class ConversationMemoryService:
    """Records and recalls recent conversation turns, scoped by conversation id.

    Args:
        store: Where turns are actually kept. Defaults to a fresh
            :class:`~src.ai.memory.store.InMemoryConversationStore` — pass
            a different :class:`~src.ai.memory.store.ConversationStorePort`
            implementation (e.g. a future DB-backed store) to persist
            across process restarts without changing any caller of this
            service.
        max_turns: How many of the most recent turns to retain per
            conversation. Configurable per deployment (see
            ``settings.CONVERSATION_MEMORY_MAX_TURNS`` in
            ``src/config/settings.py``) rather than hardcoded, since the
            right window depends on model context size and how chatty a
            deployment's users are.
    """

    def __init__(self, store: ConversationStorePort | None = None, *, max_turns: int = 10) -> None:
        if max_turns < 1:
            raise ValueError("max_turns must be at least 1")
        self._store = store if store is not None else InMemoryConversationStore()
        self._max_turns = max_turns

    @property
    def max_turns(self) -> int:
        return self._max_turns

    def remember(self, conversation_id: str, turn: ConversationTurn) -> None:
        """Record one turn, trimming ``conversation_id``'s history to :attr:`max_turns`."""
        self._store.append(conversation_id, turn, max_turns=self._max_turns)

    def recall(self, conversation_id: str, *, limit: int | None = None) -> tuple[ConversationTurn, ...]:
        """Return ``conversation_id``'s remembered turns, oldest first.

        Args:
            limit: Cap the number of turns returned to the most recent
                ``limit``. ``None`` (default) returns everything retained
                — already bounded by :attr:`max_turns` at write time.
        """
        return self._store.recent(conversation_id, limit=limit)

    def forget(self, conversation_id: str) -> None:
        """Discard all remembered turns for ``conversation_id``."""
        self._store.clear(conversation_id)
