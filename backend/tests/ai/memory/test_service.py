"""Tests for the Conversation Memory Service (src.ai.memory.service)."""

from __future__ import annotations

import pytest

from src.ai.llm.context import GraphContextItem, RagContextItem
from src.ai.memory.schemas import ConversationTurn
from src.ai.memory.service import ConversationMemoryService
from src.ai.memory.store import ConversationStorePort


def _turn(query: str = "q", response: str = "r") -> ConversationTurn:
    return ConversationTurn(query=query, response=response)


class TestConversationMemoryService:
    def test_recall_empty_conversation_returns_nothing(self) -> None:
        service = ConversationMemoryService()

        assert service.recall("unknown-conv") == ()

    def test_remember_then_recall_round_trips(self) -> None:
        service = ConversationMemoryService()
        turn = _turn("what is the risk?", "Boiler-Area is critical.")

        service.remember("conv-1", turn)

        assert service.recall("conv-1") == (turn,)

    def test_conversations_are_isolated(self) -> None:
        service = ConversationMemoryService()
        service.remember("conv-1", _turn("a", "a-resp"))
        service.remember("conv-2", _turn("b", "b-resp"))

        assert [t.query for t in service.recall("conv-1")] == ["a"]
        assert [t.query for t in service.recall("conv-2")] == ["b"]

    def test_recall_is_oldest_first(self) -> None:
        service = ConversationMemoryService(max_turns=10)
        service.remember("conv-1", _turn("first", "r1"))
        service.remember("conv-1", _turn("second", "r2"))
        service.remember("conv-1", _turn("third", "r3"))

        assert [t.query for t in service.recall("conv-1")] == ["first", "second", "third"]

    def test_memory_length_is_configurable_and_evicts_oldest(self) -> None:
        service = ConversationMemoryService(max_turns=2)
        service.remember("conv-1", _turn("first", "r1"))
        service.remember("conv-1", _turn("second", "r2"))
        service.remember("conv-1", _turn("third", "r3"))

        assert [t.query for t in service.recall("conv-1")] == ["second", "third"]

    def test_recall_limit_returns_most_recent_subset(self) -> None:
        service = ConversationMemoryService(max_turns=10)
        service.remember("conv-1", _turn("first", "r1"))
        service.remember("conv-1", _turn("second", "r2"))
        service.remember("conv-1", _turn("third", "r3"))

        assert [t.query for t in service.recall("conv-1", limit=2)] == ["second", "third"]

    def test_forget_clears_only_that_conversation(self) -> None:
        service = ConversationMemoryService()
        service.remember("conv-1", _turn("a", "a-resp"))
        service.remember("conv-2", _turn("b", "b-resp"))

        service.forget("conv-1")

        assert service.recall("conv-1") == ()
        assert [t.query for t in service.recall("conv-2")] == ["b"]

    def test_forgetting_unknown_conversation_is_a_no_op(self) -> None:
        service = ConversationMemoryService()

        service.forget("never-existed")  # must not raise

    def test_rejects_non_positive_max_turns(self) -> None:
        with pytest.raises(ValueError):
            ConversationMemoryService(max_turns=0)

    def test_retrieved_context_and_referenced_entities_are_preserved(self) -> None:
        service = ConversationMemoryService()
        turn = ConversationTurn(
            query="what is the risk in Boiler-Area?",
            response="Boiler-Area is at critical risk.",
            retrieved_context=(RagContextItem(content="Permit required for hot work.", source="OISD-STD-118"),),
            referenced_entities=(GraphContextItem(category="worker", record={"worker_id": "W1"}),),
        )

        service.remember("conv-1", turn)
        recalled = service.recall("conv-1")[0]

        assert recalled.retrieved_context[0].content == "Permit required for hot work."
        assert recalled.referenced_entities[0].record == {"worker_id": "W1"}

    def test_accepts_a_custom_store_implementation(self) -> None:
        class _FakeStore:
            def __init__(self) -> None:
                self.appended: list[tuple[str, ConversationTurn]] = []

            def append(self, conversation_id: str, turn: ConversationTurn, *, max_turns: int) -> None:
                self.appended.append((conversation_id, turn))

            def recent(self, conversation_id: str, *, limit: int | None = None) -> tuple[ConversationTurn, ...]:
                return tuple(turn for cid, turn in self.appended if cid == conversation_id)

            def clear(self, conversation_id: str) -> None:
                self.appended = [(cid, turn) for cid, turn in self.appended if cid != conversation_id]

        fake_store: ConversationStorePort = _FakeStore()
        service = ConversationMemoryService(store=fake_store)
        turn = _turn("hello", "hi")

        service.remember("conv-1", turn)

        assert service.recall("conv-1") == (turn,)
        assert fake_store.appended == [("conv-1", turn)]  # type: ignore[attr-defined]
