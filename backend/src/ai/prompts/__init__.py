"""Prompt templates for the AI Safety Copilot — stored separately from business logic.

Every prompt string the Copilot ever sends to an LLM lives in this
package, not in :mod:`src.ai.llm` (which calls the model) or
:mod:`src.ai.copilot` (which orchestrates agents). This keeps prompt
wording changes — tuning tone, adding a constraint, adjusting the
explainability requirement — a one-file edit that never touches
generation or orchestration code.

Six templates, one module each, each exporting a module-level
``TEMPLATE`` (a :class:`~src.ai.prompts.base.PromptTemplate`):
    - :mod:`~src.ai.prompts.general` — fallback for requests that don't
      map onto a specific domain.
    - :mod:`~src.ai.prompts.risk_analysis` — Risk Engine output.
    - :mod:`~src.ai.prompts.compliance` — retrieved regulatory context.
    - :mod:`~src.ai.prompts.emergency_response` — dispatched emergency actions.
    - :mod:`~src.ai.prompts.recommendations` — synthesized, prioritized recommendations.
    - :mod:`~src.ai.prompts.incident_investigation` — incident root-cause analysis.

:mod:`~src.ai.prompts.registry` is the single lookup point
(:func:`~src.ai.prompts.registry.get_template`) — callers select a
template by name rather than importing a domain module directly, so
adding a new template is one new module plus one registration, never a
change to a caller's selection logic. See ``base.py`` for the shared
:class:`~src.ai.prompts.base.PromptTemplate` contract and context-
formatting helpers every template is built from.
"""

from src.ai.prompts.base import PromptTemplate, build_standard_user_prompt, format_context_sections
from src.ai.prompts.registry import (
    COMPLIANCE,
    EMERGENCY_RESPONSE,
    GENERAL,
    INCIDENT_INVESTIGATION,
    RECOMMENDATIONS,
    RISK_ANALYSIS,
    available_templates,
    get_template,
)


__all__ = [
    "PromptTemplate",
    "build_standard_user_prompt",
    "format_context_sections",
    "get_template",
    "available_templates",
    "GENERAL",
    "RISK_ANALYSIS",
    "COMPLIANCE",
    "EMERGENCY_RESPONSE",
    "RECOMMENDATIONS",
    "INCIDENT_INVESTIGATION",
]
