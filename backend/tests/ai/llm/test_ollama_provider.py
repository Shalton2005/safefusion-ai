"""Tests for OllamaLlmProvider's failure handling (src.ai.llm.ollama_provider)."""

from __future__ import annotations

import logging
import time

import pytest

from src.ai.exceptions import LlmUnavailableError
from src.ai.llm.config import LlmConfig
from src.ai.llm.ollama_provider import OllamaLlmProvider, check_ollama_reachable

# Port 1 is a privileged, essentially always-closed port on every
# platform — connecting to it fails fast/deterministically without
# depending on a real unreachable-but-routable address (which can hang
# on some networks waiting for a TCP RST).
_UNREACHABLE_BASE_URL = "http://localhost:1"


class TestOllamaLlmProviderFailureHandling:
    def test_unreachable_server_raises_llm_unavailable_error(self) -> None:
        provider = OllamaLlmProvider(LlmConfig(base_url=_UNREACHABLE_BASE_URL, timeout_seconds=2.0))

        with pytest.raises(LlmUnavailableError) as exc_info:
            provider.generate(system_prompt="sys", user_prompt="hello")

        assert exc_info.value.dependency == "ollama"

    def test_unreachable_server_fails_within_a_bounded_time(self) -> None:
        provider = OllamaLlmProvider(LlmConfig(base_url=_UNREACHABLE_BASE_URL, timeout_seconds=2.0))

        start = time.monotonic()
        with pytest.raises(LlmUnavailableError):
            provider.generate(system_prompt="sys", user_prompt="hello")
        elapsed = time.monotonic() - start

        # Generous upper bound — proves it's bounded (not indefinite),
        # not a strict assertion on the exact configured timeout value,
        # since the underlying client may retry once internally.
        assert elapsed < 30.0

    def test_empty_prompt_raises_value_error_before_any_network_call(self) -> None:
        provider = OllamaLlmProvider(LlmConfig(base_url=_UNREACHABLE_BASE_URL, timeout_seconds=2.0))

        with pytest.raises(ValueError):
            provider.generate(system_prompt="sys", user_prompt="   ")

    def test_config_rejects_non_positive_timeout(self) -> None:
        with pytest.raises(ValueError):
            LlmConfig(timeout_seconds=0.0)


class TestOllamaLlmProviderTiming:
    def test_a_failed_call_still_logs_an_llm_generate_timing_line(self, caplog: pytest.LogCaptureFixture) -> None:
        """Timing is inside the try block, so a slow failure is measured too, not just a slow success."""
        provider = OllamaLlmProvider(LlmConfig(base_url=_UNREACHABLE_BASE_URL, timeout_seconds=2.0))

        with caplog.at_level(logging.INFO, logger="src.ai.llm.ollama_provider"):
            with pytest.raises(LlmUnavailableError):
                provider.generate(system_prompt="sys", user_prompt="hello")

        timing_lines = [r.message for r in caplog.records if "operation=llm_generate" in r.message]
        assert len(timing_lines) == 1
        assert "model=" in timing_lines[0]
        assert "duration_ms=" in timing_lines[0]


class TestCheckOllamaReachable:
    def test_unreachable_server_returns_false(self) -> None:
        assert check_ollama_reachable(_UNREACHABLE_BASE_URL, timeout_seconds=2.0) is False

    def test_unreachable_server_does_not_raise(self) -> None:
        # The whole point of a health probe is it never raises — callers
        # shouldn't need a try/except around it.
        result = check_ollama_reachable(_UNREACHABLE_BASE_URL, timeout_seconds=2.0)
        assert result in (True, False)

    def test_unreachable_server_fails_within_a_bounded_time(self) -> None:
        start = time.monotonic()
        check_ollama_reachable(_UNREACHABLE_BASE_URL, timeout_seconds=2.0)
        elapsed = time.monotonic() - start

        assert elapsed < 30.0

    def test_malformed_base_url_returns_false_without_raising(self) -> None:
        assert check_ollama_reachable("not-a-valid-url", timeout_seconds=1.0) is False
