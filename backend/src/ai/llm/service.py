"""Reusable LLM generation service for SafeFusion AI.

Turns a question plus :class:`~src.ai.llm.context.LlmContext` (RAG,
knowledge graph, and/or Risk Engine data) into an explainable
:class:`LlmResponse`. Depends only on :class:`~src.ai.llm.port.LlmProviderPort`
— never on ``OllamaLlmProvider`` or any other concrete provider — so the
LLM backend can be swapped by constructing this service with a
different provider instance. Nothing here changes when that happens.

Prompt text itself is never assembled in this module — see
:mod:`src.ai.prompts` for the single source of truth on wording. This
service only selects a template by domain (via
:func:`~src.ai.prompts.get_template`) and passes the question/context
through it. No FastAPI import anywhere in this module.
"""

from __future__ import annotations

from dataclasses import dataclass

from src.ai.llm.context import LlmContext
from src.ai.llm.port import LlmProviderPort
# Imports the registry module directly, not the src.ai.prompts package
# __init__ — that __init__ imports base.py, which imports LlmContext
# from this package, and importing the src.ai.prompts package from here
# during src.ai.llm's own package initialization would be circular.
from src.ai.prompts.registry import GENERAL, get_template
from src.utils.logger import get_logger


logger = get_logger(__name__)

_ANSWER_HEADER = "1. Answer"
_REASONING_HEADER = "2. Reasoning"


@dataclass(frozen=True, slots=True)
class LlmResponse:
    """Structured, explainable output of a single LLM generation call.

    Attributes:
        answer: The direct answer to the question.
        reasoning: The model's explanation of which context led to that
            answer — split out from ``answer`` (per the required
            two-part structure every :mod:`src.ai.prompts` template
            enforces in its system prompt) so a caller can show "why"
            separately from "what", or omit it entirely for a terse UI.
            Empty string if the model didn't follow the requested
            structure — see :func:`_split_answer_and_reasoning`.
        model: Name of the model that produced this response.
        raw_text: The complete, unparsed model output, kept for callers
            that want the original text regardless of how the
            answer/reasoning split turned out.
    """

    answer: str
    reasoning: str
    model: str
    raw_text: str


class LlmService:
    """Generates explainable responses grounded in RAG, graph, and risk context.

    Args:
        provider: Any object satisfying :class:`~src.ai.llm.port.LlmProviderPort`
            (e.g. :class:`~src.ai.llm.ollama_provider.OllamaLlmProvider`).
            Injected rather than constructed internally so tests can pass
            a fake and production code can pass whichever provider is
            configured, without this class knowing which one it is.
    """

    def __init__(self, provider: LlmProviderPort) -> None:
        self._provider = provider

    @property
    def model_name(self) -> str:
        return self._provider.model_name

    def generate(self, *, question: str, context: LlmContext | None = None, domain: str = GENERAL) -> LlmResponse:
        """Generate an explainable response to ``question`` using the supplied context.

        Args:
            question: The user's natural-language question.
            context: Context from RAG, the knowledge graph, and/or the
                Risk Engine. Defaults to an empty :class:`LlmContext` —
                the model still responds, but the system prompt
                instructs it to say so rather than invent facts.
            domain: Which :mod:`src.ai.prompts` template to use (e.g.
                :data:`~src.ai.prompts.RISK_ANALYSIS`,
                :data:`~src.ai.prompts.COMPLIANCE`). Defaults to the
                general-purpose template. An unrecognized domain falls
                back to it too (see
                :func:`~src.ai.prompts.registry.get_template`) rather
                than raising.

        Raises:
            ValueError: If ``question`` is empty.
        """
        if not question or not question.strip():
            raise ValueError("question must not be empty")

        context = context or LlmContext()
        template = get_template(domain)
        user_prompt = template.build_user_prompt(question, context)

        logger.info(
            "LLM generate model=%s domain=%s rag_items=%d graph_items=%d risk_items=%d",
            self._provider.model_name,
            template.name,
            len(context.rag),
            len(context.graph),
            len(context.risk),
        )

        raw_text = self._provider.generate(system_prompt=template.system_prompt, user_prompt=user_prompt)
        answer, reasoning = _split_answer_and_reasoning(raw_text)

        return LlmResponse(answer=answer, reasoning=reasoning, model=self._provider.model_name, raw_text=raw_text)


def _split_answer_and_reasoning(raw_text: str) -> tuple[str, str]:
    """Split raw model output into (answer, reasoning) per the requested two-part structure.

    Best-effort text parsing, not a strict contract — local models don't
    reliably follow formatting instructions. If either header is
    missing, the entire response is returned as ``answer`` with an empty
    ``reasoning`` rather than raising, since a malformed split is a
    presentation concern, not a failure of generation itself.
    """
    answer_index = raw_text.find(_ANSWER_HEADER)
    reasoning_index = raw_text.find(_REASONING_HEADER)

    if answer_index == -1 or reasoning_index == -1 or reasoning_index < answer_index:
        return raw_text.strip(), ""

    answer = raw_text[answer_index + len(_ANSWER_HEADER) : reasoning_index].strip(" \n:-")
    reasoning = raw_text[reasoning_index + len(_REASONING_HEADER) :].strip(" \n:-")
    return answer, reasoning
