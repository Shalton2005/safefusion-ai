"""Shared prompt-template contract and context-formatting helpers.

Every domain template in this package (``risk_analysis.py``,
``compliance.py``, ``emergency_response.py``, ``recommendations.py``,
``incident_investigation.py``) is a :class:`PromptTemplate` — a system
prompt plus a user-prompt builder — built from the same small set of
formatting helpers here, so the five templates read as variations on
one shape rather than five independently reinvented ones.

This module has no runtime dependency on :mod:`src.ai.llm` or any agent
— it only knows the shape of :class:`~src.ai.llm.context.LlmContext`
(``rag``/``graph``/``risk`` list attributes, each with a ``.format()``
method), duck-typed rather than imported at runtime specifically to
avoid a circular import (``src.ai.llm.service`` imports this package to
select a template; if this module imported ``src.ai.llm.context`` back,
importing either package first would fail while the other is still
initializing). The type is still imported under ``TYPE_CHECKING`` for
static analysis. Business logic (which template to use, how to call the
model, parsing the response) lives in :mod:`src.ai.llm.service`, not
here — this package is prompt text only.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from src.ai.llm.context import LlmContext

_NO_CONTEXT_NOTICE = "No supporting context was supplied for this question."


@dataclass(frozen=True, slots=True)
class PromptTemplate:
    """A named, reusable prompt for one Copilot domain.

    Attributes:
        name: Stable identifier used to select this template (e.g.
            ``"risk_analysis"``) — matches the key it's registered
            under in :mod:`src.ai.prompts.registry`.
        system_prompt: Fixed instructions governing every call made
            with this template.
        build_user_prompt: Assembles the per-call user-turn prompt from
            a question and its :class:`~src.ai.llm.context.LlmContext`.
            Kept as a field (not a method every subclass overrides) so
            a template is a plain, inspectable piece of data — swapping
            one out is reassigning a value, not writing a class.
    """

    name: str
    system_prompt: str
    build_user_prompt: Callable[[str, LlmContext], str]


def format_context_sections(context: LlmContext) -> str:
    """Render every populated context source into labeled sections, in a fixed order.

    Shared by every template's ``build_user_prompt`` so RAG/graph/risk
    formatting is identical across domains — only the surrounding
    instructions (the system prompt, any extra sections a template
    layers on) differ per domain.
    """
    sections: list[str] = []

    if context.rag:
        sections.append(_build_section("Retrieved regulatory/document context", [item.format() for item in context.rag]))
    if context.graph:
        sections.append(_build_section("Knowledge graph relationships", [item.format() for item in context.graph]))
    if context.risk:
        sections.append(_build_section("Risk engine assessment", [item.format() for item in context.risk]))

    return "\n\n".join(sections) if sections else _NO_CONTEXT_NOTICE


def build_standard_user_prompt(question: str, context: LlmContext) -> str:
    """Default user-prompt shape: a question followed by its formatted context sections.

    Used as-is by templates with no domain-specific framing need, and
    as a building block by templates that add their own lead-in text
    around the same context block (see e.g. ``recommendations.py``).
    """
    return f"Question: {question}\n\nSupporting context:\n{format_context_sections(context)}"


def _build_section(title: str, lines: list[str]) -> str:
    body = "\n".join(lines)
    return f"{title}:\n{body}"
