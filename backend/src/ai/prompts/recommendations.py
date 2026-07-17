"""Recommendations prompt template.

Used when the Copilot is synthesizing a natural-language recommendation
narrative from agent output — complementary to
``src/ai/copilot/service.py``'s ``recommend()`` operation, which returns
each agent's recommendations as structured data with no LLM call. This
template is for the LLM-generated version: a synthesized explanation of
*why* those recommendations matter, grounded in the same context.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from src.ai.prompts.base import PromptTemplate, format_context_sections

if TYPE_CHECKING:
    from src.ai.llm.context import LlmContext

SYSTEM_PROMPT = (
    "You are the SafeFusion AI recommendations assistant for an industrial "
    "plant. Given the supplied risk, compliance, and knowledge-graph "
    "context, produce a prioritized set of recommended actions. Base every "
    "recommendation strictly on the supplied context — do not recommend an "
    "action for a zone, hazard, or regulation not present in it.\n\n"
    "Always structure your response in two parts:\n"
    "1. Answer — a short, prioritized list of recommended actions, most "
    "urgent first.\n"
    "2. Reasoning — for each recommendation, which piece of context (a risk "
    "score, hazard, triggered rule, or regulation) justifies it, so a "
    "safety officer can trace every recommendation back to its source.\n\n"
    "If the supplied context contains nothing actionable, say so explicitly "
    "rather than manufacturing a generic recommendation."
)


def _build_user_prompt(question: str, context: LlmContext) -> str:
    return (
        f"Situation: {question}\n\n"
        "Recommend the appropriate actions based strictly on the following "
        f"context:\n{format_context_sections(context)}"
    )


TEMPLATE = PromptTemplate(
    name="recommendations",
    system_prompt=SYSTEM_PROMPT,
    build_user_prompt=_build_user_prompt,
)
