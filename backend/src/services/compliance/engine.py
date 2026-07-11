"""Compliance Rule Engine: evaluates incidents against regulatory rules."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.models.enums import ComplianceStatus
from src.models.incident import Incident
from src.services.compliance.knowledge_source import (
    ComplianceKnowledgeSourcePort,
    NullKnowledgeSource,
)
from src.services.compliance.rules import ComplianceRule
from src.services.compliance.schemas import ComplianceViolation, IncidentComplianceResult


@dataclass
class ComplianceRuleEngine:
    """Evaluates configured compliance rules against detected incidents.

    Purely rule-based: attribute comparisons only, no AI/ML. The optional
    ``knowledge_source`` is the RAG-readiness seam — when a real
    retrieval-backed implementation is supplied, each violation is
    enriched with supporting citations without changing how rules are
    evaluated. Defaults to :class:`NullKnowledgeSource` (no citations).
    """

    rules: list[ComplianceRule] = field(default_factory=list)
    knowledge_source: ComplianceKnowledgeSourcePort = field(default_factory=NullKnowledgeSource)

    def evaluate(self, incident: Incident) -> IncidentComplianceResult:
        """Run every configured rule against a single incident.

        Returns:
            An ``IncidentComplianceResult`` with ``COMPLIANT`` status and
            no violations if no rule fired, or ``NON_COMPLIANT`` with the
            list of violated rules (enriched with citations, if any).
        """
        violations: list[ComplianceViolation] = []
        for rule in self.rules:
            violation = rule.evaluate(incident)
            if violation is None:
                continue
            citations = self.knowledge_source.get_citations(violation.rule_code)
            if citations:
                violation = ComplianceViolation(
                    rule_code=violation.rule_code,
                    framework=violation.framework,
                    title=violation.title,
                    description=violation.description,
                    recommendation=violation.recommendation,
                    citations=citations,
                )
            violations.append(violation)

        status = ComplianceStatus.NON_COMPLIANT if violations else ComplianceStatus.COMPLIANT
        return IncidentComplianceResult(
            incident_id=str(incident.id),
            status=status,
            violations=violations,
        )

    def evaluate_many(self, incidents: list[Incident]) -> list[IncidentComplianceResult]:
        """Evaluate every incident and return one result per incident, in order."""
        return [self.evaluate(incident) for incident in incidents]
