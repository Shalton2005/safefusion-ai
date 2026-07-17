"""Tests for InMemoryConversationStore (src.ai.memory.store)."""

from __future__ import annotations

from src.ai.memory.schemas import ConversationTurn
from src.ai.memory.store import InMemoryConversationStore


def _turn(query: str) -> ConversationTurn:
    return ConversationTurn(query=query, response=f"response to {query}")


class TestInMemoryConversationStore:
    def test_append_and_recent_round_trip(self) -> None:
        store = InMemoryConversationStore()
        turn = _turn("a")

        store.append("conv-1", turn, max_turns=5)

        assert store.recent("conv-1") == (turn,)

    def test_recent_on_unknown_conversation_returns_empty(self) -> None:
        store = InMemoryConversationStore()

        assert store.recent("unknown") == ()

    def test_append_evicts_oldest_beyond_max_turns(self) -> None:
        store = InMemoryConversationStore()
        store.append("conv-1", _turn("a"), max_turns=2)
        store.append("conv-1", _turn("b"), max_turns=2)
        store.append("conv-1", _turn("c"), max_turns=2)

        assert [t.query for t in store.recent("conv-1")] == ["b", "c"]

    def test_max_turns_change_mid_conversation_rebuilds_bound(self) -> None:
        """A caller changing max_turns between appends (e.g. reloaded config) still enforces the new bound."""
        store = InMemoryConversationStore()
        store.append("conv-1", _turn("a"), max_turns=5)
        store.append("conv-1", _turn("b"), max_turns=5)
        store.append("conv-1", _turn("c"), max_turns=5)

        store.append("conv-1", _turn("d"), max_turns=2)

        assert [t.query for t in store.recent("conv-1")] == ["c", "d"]

    def test_clear_removes_only_that_conversation(self) -> None:
        store = InMemoryConversationStore()
        store.append("conv-1", _turn("a"), max_turns=5)
        store.append("conv-2", _turn("b"), max_turns=5)

        store.clear("conv-1")

        assert store.recent("conv-1") == ()
        assert [t.query for t in store.recent("conv-2")] == ["b"]

    def test_recent_limit_returns_most_recent(self) -> None:
        store = InMemoryConversationStore()
        store.append("conv-1", _turn("a"), max_turns=5)
        store.append("conv-1", _turn("b"), max_turns=5)
        store.append("conv-1", _turn("c"), max_turns=5)

        assert [t.query for t in store.recent("conv-1", limit=2)] == ["b", "c"]
