"""Tests for the process-wide default dispatcher accessor."""

from __future__ import annotations

from src.services.event_bus.bus import get_default_dispatcher, reset_default_dispatcher
from src.services.event_bus.dispatcher import EventDispatcher


class TestGetDefaultDispatcher:
    def setup_method(self) -> None:
        reset_default_dispatcher()

    def teardown_method(self) -> None:
        reset_default_dispatcher()

    def test_returns_a_dispatcher_instance(self) -> None:
        assert isinstance(get_default_dispatcher(), EventDispatcher)

    def test_returns_the_same_instance_across_calls(self) -> None:
        assert get_default_dispatcher() is get_default_dispatcher()

    def test_reset_produces_a_fresh_instance(self) -> None:
        first = get_default_dispatcher()
        reset_default_dispatcher()
        second = get_default_dispatcher()
        assert first is not second
