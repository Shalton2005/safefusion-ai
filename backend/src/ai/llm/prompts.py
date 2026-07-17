"""Centralized prompt templates for the LLM service.

Every prompt string the LLM service ever sends lives here — no other
module in ``src.ai`` (or anywhere else in the codebase) should construct
system/user prompt text inline. This keeps prompt wording a one-file
change: tuning tone, adding a constraint, or adjusting the explainability
requirement never touches ``service.py``, an agent, or a route.

Two responsibilities:
    - :data:`SYSTEM_PROMPT` — fixed instructions governing every call.
    - :func:`build_user_prompt` — assembles the per-call user prompt
      from a question plus whatever :class:`~src.ai.llm.context.LlmContext`
      was supplied, keeping context formatting (see
      ``src/ai/llm/context.py``) and prompt assembly as separate
      concerns: this function only arranges already-formatted sections,
      it never decides how a RAG/graph/risk item renders to text.
"""

from __future__ import annotations

from src.ai.llm.context import LlmContext

SYSTEM_PROMPT = (
    "You are the SafeFusion AI safety assistant for an industrial plant. "
    "Answer the user's question using only the supporting context provided "
    "below — retrieved regulatory documents, knowledge-graph relationships, "
    "and risk engine output. Do not invent facts, zones, regulations, or "
    "figures that are not present in the context.\n\n"
    "Always structure your response in two parts:\n"
    "1. Answer — a direct, concise answer to the question.\n"
    "2. Reasoning — a short explanation of which pieces of context led to "
    "that answer, so a safety officer can verify your conclusion against "
    "the source data rather than trust it blindly.\n\n"
    "If the supplied context does not contain enough information to answer "
    "confidently, say so explicitly instead of guessing."
)

_NO_CONTEXT_NOTICE = "No supporting context was supplied for this question."


def build_user_prompt(*, question: str, context: LlmContext) -> str:
    """Assemble the user-turn prompt from a question and its supporting context.

    Args:
        question: The user's natural-language question.
        context: Context gathered from RAG, the knowledge graph, and/or
            the Risk Engine (see ``src/ai/llm/context.py``). Any
            combination of sources may be empty.

    Returns:
        The full user-turn prompt text, ready to send via
        :class:`~src.ai.llm.port.LlmProviderPort`.
    """
    sections: list[str] = []

    if context.rag:
        sections.append(_build_section("Retrieved regulatory/document context", [item.format() for item in context.rag]))
    if context.graph:
        sections.append(_build_section("Knowledge graph relationships", [item.format() for item in context.graph]))
    if context.risk:
        sections.append(_build_section("Risk engine assessment", [item.format() for item in context.risk]))

    context_block = "\n\n".join(sections) if sections else _NO_CONTEXT_NOTICE

    return f"Question: {question}\n\nSupporting context:\n{context_block}"


def _build_section(title: str, lines: list[str]) -> str:
    body = "\n".join(lines)
    return f"{title}:\n{body}"
