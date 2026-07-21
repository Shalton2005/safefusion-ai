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
    "immediate action (evacuate, stop work, isolate equipment).\n\n"
    "Respond in a natural, urgent yet professional tone. Weave the immediate "
    "actions and the risk score or hazard justifying them together "
    "seamlessly, without using rigid headings like '**Answer:**' or "
    "'**Reasoning:**'. Cite any referenced regulatory passage inline as "
    "(Document Name, Page N).\n\n"
    "If the supplied context contains no emergency action for the zone, "
    "politely state the current known status based on the context and ask if "
    "they need to run a manual assessment."
)

TEMPLATE = PromptTemplate(
    name="emergency_response",
    system_prompt=SYSTEM_PROMPT,
    build_user_prompt=build_standard_user_prompt,
)
