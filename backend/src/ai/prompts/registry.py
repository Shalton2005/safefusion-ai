"""Prompt template registry — the single lookup point for selecting a domain template.

Mirrors :class:`~src.ai.agents.registry.AgentRegistry`'s shape:
callers (chiefly :class:`~src.ai.llm.service.LlmService`) ask for a
template by name rather than importing a domain module directly, so
adding a sixth template later is one new module plus one registration
here — no change to any caller's lookup logic.
"""

from __future__ import annotations

from src.ai.prompts.base import PromptTemplate
from src.ai.prompts.compliance import TEMPLATE as COMPLIANCE_TEMPLATE
from src.ai.prompts.emergency_response import TEMPLATE as EMERGENCY_RESPONSE_TEMPLATE
from src.ai.prompts.general import TEMPLATE as GENERAL_TEMPLATE
from src.ai.prompts.incident_investigation import TEMPLATE as INCIDENT_INVESTIGATION_TEMPLATE
from src.ai.prompts.recommendations import TEMPLATE as RECOMMENDATIONS_TEMPLATE
from src.ai.prompts.risk_analysis import TEMPLATE as RISK_ANALYSIS_TEMPLATE

GENERAL = GENERAL_TEMPLATE.name
RISK_ANALYSIS = RISK_ANALYSIS_TEMPLATE.name
COMPLIANCE = COMPLIANCE_TEMPLATE.name
EMERGENCY_RESPONSE = EMERGENCY_RESPONSE_TEMPLATE.name
RECOMMENDATIONS = RECOMMENDATIONS_TEMPLATE.name
INCIDENT_INVESTIGATION = INCIDENT_INVESTIGATION_TEMPLATE.name

_TEMPLATES: dict[str, PromptTemplate] = {
    GENERAL: GENERAL_TEMPLATE,
    RISK_ANALYSIS: RISK_ANALYSIS_TEMPLATE,
    COMPLIANCE: COMPLIANCE_TEMPLATE,
    EMERGENCY_RESPONSE: EMERGENCY_RESPONSE_TEMPLATE,
    RECOMMENDATIONS: RECOMMENDATIONS_TEMPLATE,
    INCIDENT_INVESTIGATION: INCIDENT_INVESTIGATION_TEMPLATE,
}


def get_template(name: str) -> PromptTemplate:
    """Look up a template by name, falling back to :data:`GENERAL` if unknown.

    Never raises — an unrecognized domain name (e.g. a typo, or a
    caller passing an agent name that has no dedicated template) still
    produces a usable prompt rather than failing the whole generation
    call over a template-selection mismatch.
    """
    return _TEMPLATES.get(name, _TEMPLATES[GENERAL])


def available_templates() -> tuple[str, ...]:
    """Every registered template name, for callers that want to list/validate domains."""
    return tuple(_TEMPLATES.keys())
