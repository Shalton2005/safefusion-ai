"""Tests for Supervisor.known_handoffs() — public introspection of the handoff table."""

from __future__ import annotations

from src.ai.agents.supervisor import known_handoffs


class TestKnownHandoffs:
    def test_includes_the_risk_to_emergency_handoff(self) -> None:
        handoffs = known_handoffs()

        assert ("risk", "risk_results") in handoffs

    def test_returns_a_tuple_of_producer_param_pairs(self) -> None:
        handoffs = known_handoffs()

        assert isinstance(handoffs, tuple)
        for entry in handoffs:
            assert isinstance(entry, tuple)
            assert len(entry) == 2

    def test_does_not_expose_extractor_callables(self) -> None:
        handoffs = known_handoffs()

        for producer, consumer_param in handoffs:
            assert isinstance(producer, str)
            assert isinstance(consumer_param, str)
