"""Camera evidence enrichment for the Explainability Service.

Deliberately not a Supervisor ``AgentPort``/LangGraph node: Computer
Vision findings are not routed through the Supervisor's agent-selection
graph the way Risk/Compliance/Knowledge/Graph Knowledge/Emergency are —
they are produced continuously by the CV pipeline
(``src.services.computer_vision``) and correlated by the Compound Risk
Engine (``src.services.compound_risk``), independent of any one user
query. This module is a lightweight, LLM-free enrichment step: given the
``ZoneCompoundRiskResult``s a request already touches, pull out whichever
triggered rules were camera-sourced and shape them into the same
evidence/regulation/escalation vocabulary
:mod:`~src.ai.agents.explainability_service` already uses for every other
source, so a "why" report can say *why a camera-observed condition
factored into this answer* without adding a new agent, a new LangGraph
node, or a new registry entry.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from src.services.compound_risk.schemas import CompoundRiskRuleMatch, ZoneCompoundRiskResult

#: Rule names in src.services.compound_risk.rules that correlate a
#: Computer Vision / PPE Compliance Engine signal. Kept as an explicit
#: allow-list (rather than e.g. a naming-convention check) so a rule
#: shows up here only when someone deliberately marks it as camera-backed.
CAMERA_CORRELATED_RULE_NAMES: frozenset[str] = frozenset(
    {
        "camera_critical_detection_without_active_permit",
        "ppe_violation_with_worker_present",
    }
)

#: Compliance rule code (src.config.compliance_rules.COMPLIANCE_RULES) most
#: directly applicable to a PPE-sourced escalation — used to populate
#: CameraEvidenceItem.related_regulation without requiring the caller to
#: have already run the Compliance agent.
PPE_COMPLIANCE_RULE_CODE = "factory_act_ppe_compliance"


@dataclass(frozen=True, slots=True)
class CameraEvidenceItem:
    """One camera-sourced compound-risk finding, explained for a "why" report.

    Attributes:
        zone: Plant zone the finding concerns.
        rule_name: The compound-risk rule that fired (see
            ``CAMERA_CORRELATED_RULE_NAMES``).
        detection_confidence: The underlying detection/finding's own
            confidence, pulled from the rule match's structured
            ``evidence`` when present (falls back to the rule match's
            overall ``confidence`` otherwise).
        related_regulation: The compliance rule code most applicable to
            this finding, when known.
        reason_for_escalation: Human-readable explanation of *why* this
            camera finding contributed to the zone's risk — the rule
            match's own explanation, reused rather than regenerated so
            the "why" report never disagrees with the risk engine itself.
    """

    zone: str
    rule_name: str
    detection_confidence: float
    related_regulation: str | None
    reason_for_escalation: str


@dataclass(frozen=True, slots=True)
class CameraEvidenceSection:
    """Every camera-sourced finding across a set of zone compound-risk results."""

    items: tuple[CameraEvidenceItem, ...] = field(default_factory=tuple)

    @property
    def has_camera_evidence(self) -> bool:
        return len(self.items) > 0


def _detection_confidence(match: CompoundRiskRuleMatch) -> float:
    """Prefer the rule match's own detection-level confidence, if its evidence carries one."""
    evidence = match.evidence or {}
    if "detection_confidence" in evidence:
        return float(evidence["detection_confidence"])

    camera_events = evidence.get("camera_events")
    if camera_events:
        confidences = [row.get("confidence") for row in camera_events if row.get("confidence") is not None]
        if confidences:
            return float(max(confidences))

    return match.confidence


def build_camera_evidence(zone_results: list[ZoneCompoundRiskResult]) -> CameraEvidenceSection:
    """Extract every camera-sourced triggered rule across ``zone_results`` into a report section.

    Args:
        zone_results: Typically ``CompoundRiskService.detect_compound_risks()``'s
            output for the zone(s) a request concerns.
    """
    items: list[CameraEvidenceItem] = []
    for zone_result in zone_results:
        for match in zone_result.triggered_rules:
            if match.rule_name not in CAMERA_CORRELATED_RULE_NAMES:
                continue
            items.append(
                CameraEvidenceItem(
                    zone=zone_result.zone,
                    rule_name=match.rule_name,
                    detection_confidence=_detection_confidence(match),
                    related_regulation=PPE_COMPLIANCE_RULE_CODE,
                    reason_for_escalation=match.explanation,
                )
            )

    return CameraEvidenceSection(items=tuple(items))
