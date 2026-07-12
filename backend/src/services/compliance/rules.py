"""Configurable compliance rules for SafeFusion AI.

Each rule inspects a single detected incident and decides whether it
violates a predefined regulatory condition (Factory Act, OISD, DGMS).
Rules are pure, stateless, and pluggable: new rules can be added without
touching the engine or other rules, following the same ``Protocol``
strategy pattern used by ``src.services.compound_risk``.
"""

from __future__ import annotations

from typing import Protocol

from src.config.compliance_rules import ComplianceRuleConfig, severity_at_least
from src.models.incident import Incident
from src.services.compliance.schemas import ComplianceViolation


class ComplianceRule(Protocol):
    """Contract implemented by every compliance rule.

    A rule inspects one incident and returns a violation if its
    regulatory condition is met, or ``None`` otherwise.
    """

    def evaluate(self, incident: Incident) -> ComplianceViolation | None: ...


class IncidentAttributeComplianceRule:
    """Generic rule driven entirely by a ``ComplianceRuleConfig`` entry.

    Fires when the incident's type matches the rule's configured incident
    types (or the rule applies to any type) **and** the incident's
    severity meets the rule's configured minimum (or severity is not
    part of the condition). This single generic implementation covers
    every registered compliance rule — rules differ only in their
    configuration, not their matching logic.
    """

    def __init__(self, config: ComplianceRuleConfig) -> None:
        self._config = config

    def evaluate(self, incident: Incident) -> ComplianceViolation | None:
        config = self._config

        if config.applies_to_incident_types and incident.incident_type not in config.applies_to_incident_types:
            return None

        if config.minimum_severity is not None and not severity_at_least(
            incident.severity, config.minimum_severity
        ):
            return None

        return ComplianceViolation(
            rule_code=config.code,
            framework=config.framework,
            title=config.title,
            description=config.description,
            recommendation=config.recommendation,
        )
