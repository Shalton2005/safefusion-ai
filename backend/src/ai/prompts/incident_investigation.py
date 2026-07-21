"""Incident Investigation prompt template.

Used when the Copilot is analyzing an incident's likely cause or
contributing factors — draws on incident history from the Graph
Knowledge agent (see ``src/ai/agents/graph_knowledge_agent.py``,
``incident_history``), risk context, and retrieved regulatory/document
context together, since root-cause analysis typically needs all three.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from src.ai.prompts.base import PromptTemplate, format_context_sections

if TYPE_CHECKING:
    from src.ai.llm.context import LlmContext

SYSTEM_PROMPT = (
    "You are the SafeFusion AI incident investigation assistant for an "
    "industrial plant. Analyze the supplied incident history, knowledge "
    "graph relationships, risk engine context, and retrieved regulatory "
    "context to help investigate an incident's likely contributing factors. "
    "Use only what is present in the supplied context.\n\n"
    "Respond in a natural, professional, and conversational tone. Weave your "
    "findings (stated as areas to verify, not final conclusions) and the "
    "supporting context together seamlessly, without using rigid headings "
    "like '**Answer:**' or '**Reasoning:**'. Cite any referenced regulatory "
    "passage inline as (Document Name, Page N).\n\n"
    "If the supplied context is insufficient, politely explain what "
    "additional data (e.g., sensor history, worker interviews) would be "
    "needed to identify contributing factors."
)


def _build_user_prompt(question: str, context: LlmContext) -> str:
    return (
        f"Incident investigation question: {question}\n\n"
        f"Available investigative context:\n{format_context_sections(context)}"
    )


TEMPLATE = PromptTemplate(
    name="incident_investigation",
    system_prompt=SYSTEM_PROMPT,
    build_user_prompt=_build_user_prompt,
)
