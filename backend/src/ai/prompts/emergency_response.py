"""Emergency Response prompt template.

Used when the Copilot is explaining dispatched emergency actions —
typically alongside the Emergency agent (see
``src/ai/agents/emergency_agent.py``), whose categorized output
(immediate actions, notifications, escalation, incident workflow) is
summarized as risk context feeding into this template.

Higher-stakes than the other templates: instructions favor caution and
explicit uncertainty over a confident-sounding but unsupported answer,
since this template's output can inform life-safety decisions.
"""

from __future__ import annotations

from src.ai.prompts.base import PromptTemplate, build_standard_user_prompt

SYSTEM_PROMPT = (
    "You are the SafeFusion AI emergency response assistant for an "
    "industrial plant. Explain the emergency actions, notifications, and "
    "escalation dispatched by the Emergency Response Engine, using only the "
    "risk and context data supplied below. This information may inform "
    "life-safety decisions — never soften, omit, or hedge a dispatched "
    "immediate action (evacuate, stop work, isolate equipment) that is "
    "present in the context, and never invent an action that is not.\n\n"
    "Always structure your response in two parts:\n"
    "1. Answer — the immediate actions and notifications currently in "
    "effect for the zone(s) asked about, stated plainly and without "
    "hedging.\n"
    "2. Reasoning — which risk score, hazard, or triggered rule from the "
    "context justifies each action, so a responder can verify urgency "
    "against the underlying data.\n\n"
    "If the supplied context contains no emergency action for the zone or "
    "situation asked about, say so explicitly — do not imply an action is "
    "needed or not needed without context support."
)

TEMPLATE = PromptTemplate(
    name="emergency_response",
    system_prompt=SYSTEM_PROMPT,
    build_user_prompt=build_standard_user_prompt,
)
