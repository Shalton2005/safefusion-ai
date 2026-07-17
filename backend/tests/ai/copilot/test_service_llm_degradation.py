"""Tests that AiCopilotService.explain()/chat() degrade gracefully when the LLM is unavailable.

Covers the "Ollama unavailable" failure mode at the one place it wasn't
previously handled: LlmService.generate() was called with no try/except
in explain()/chat(), so a failure there would 500 the whole request
instead of falling back to the Supervisor's own aggregated summary —
see src.ai.copilot.service._generate_or_degrade.
"""

from __future__ import annotations

from typing import Any

from src.ai.agents.base import AgentResult
from src.ai.agents.supervisor import SupervisorResponse
from src.ai.copilot.service import AiCopilotService
from src.ai.exceptions import LlmUnavailableError
from src.ai.llm.context import LlmContext
from src.ai.llm.service import LlmResponse


class _FakeCompiledGraph:
    """Fake CompiledGraphPort returning a fixed SupervisorResponse without running real agents."""

    def __init__(self, supervisor_response: SupervisorResponse) -> None:
        self._supervisor_response = supervisor_response

    def invoke(self, state: dict[str, Any]) -> dict[str, Any]:
        return {"context": {"supervisor_response": self._supervisor_response}}


class _FailingLlmService:
    """Stand-in for LlmService whose generate() always raises LlmUnavailableError."""

    def generate(self, *, question: str, context: LlmContext, domain: str) -> LlmResponse:
        raise LlmUnavailableError("Ollama connection refused")


class _BuggyLlmService:
    """Stand-in for LlmService whose generate() raises something unexpected (not a known dependency error)."""

    def generate(self, *, question: str, context: LlmContext, domain: str) -> LlmResponse:
        raise RuntimeError("unexpected provider bug")


class _WorkingLlmService:
    def generate(self, *, question: str, context: LlmContext, domain: str) -> LlmResponse:
        return LlmResponse(answer="the answer", reasoning="the reasoning", model="fake-model", raw_text="raw")


def _supervisor_response(text: str = "what is the risk?") -> SupervisorResponse:
    result = AgentResult(agent="risk", summary="Boiler-Area is critical.", data=[])
    return SupervisorResponse(request_text=text, route=("risk",), results=(result,), summary=result.summary)


class TestExplainDegradesOnLlmFailure:
    def test_typed_llm_failure_falls_back_to_supervisor_summary(self) -> None:
        supervisor_response = _supervisor_response()
        service = AiCopilotService(_FakeCompiledGraph(supervisor_response), _FailingLlmService())

        result = service.explain(text="what is the risk?")

        assert result.answer == supervisor_response.summary
        assert result.explanation == ""

    def test_typed_llm_failure_adds_a_warning_to_reasoning(self) -> None:
        service = AiCopilotService(_FakeCompiledGraph(_supervisor_response()), _FailingLlmService())

        result = service.explain(text="what is the risk?")

        assert len(result.reasoning.warnings) == 1
        assert "LLM generation unavailable" in result.reasoning.warnings[0]
        assert result.reasoning.ok is False

    def test_unexpected_llm_failure_also_degrades_instead_of_raising(self) -> None:
        service = AiCopilotService(_FakeCompiledGraph(_supervisor_response()), _BuggyLlmService())

        result = service.explain(text="what is the risk?")

        assert result.answer == _supervisor_response().summary
        assert len(result.reasoning.warnings) == 1

    def test_successful_llm_call_has_no_warnings(self) -> None:
        service = AiCopilotService(_FakeCompiledGraph(_supervisor_response()), _WorkingLlmService())

        result = service.explain(text="what is the risk?")

        assert result.answer == "the answer"
        assert result.reasoning.warnings == ()
        assert result.reasoning.ok is True


class TestChatDegradesOnLlmFailure:
    def test_typed_llm_failure_falls_back_to_supervisor_summary(self) -> None:
        supervisor_response = _supervisor_response()
        service = AiCopilotService(_FakeCompiledGraph(supervisor_response), _FailingLlmService())

        result = service.chat(message="what is the risk?")

        assert result.reply == supervisor_response.summary
        assert len(result.reasoning.warnings) == 1

    def test_successful_llm_call_has_no_warnings(self) -> None:
        service = AiCopilotService(_FakeCompiledGraph(_supervisor_response()), _WorkingLlmService())

        result = service.chat(message="what is the risk?")

        assert result.reply == "the answer"
        assert result.reasoning.warnings == ()
