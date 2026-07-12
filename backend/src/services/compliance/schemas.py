"""Dataclasses shared by the Compliance Rule Engine and service."""

from __future__ import annotations

from dataclasses import dataclass, field

from src.models.enums import ComplianceFramework, ComplianceStatus


@dataclass(frozen=True)
class ComplianceViolation:
    """A single compliance rule violated by a detected incident."""

    rule_code: str
    framework: ComplianceFramework
    title: str
    description: str
    recommendation: str
    # Populated by a future RAG knowledge source (e.g. cited passages from
    # the source OISD/Factory Act/DGMS documents indexed in pgvector).
    # Empty for the pure rule-based engine — see
    # ``src.services.compliance.knowledge_source``.
    citations: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class IncidentComplianceResult:
    """Computed compliance outcome for a single evaluated incident."""

    incident_id: str
    status: ComplianceStatus
    violations: list[ComplianceViolation]

    @property
    def violated_frameworks(self) -> list[ComplianceFramework]:
        """Distinct frameworks violated, in first-seen order."""
        seen: list[ComplianceFramework] = []
        for violation in self.violations:
            if violation.framework not in seen:
                seen.append(violation.framework)
        return seen

    @property
    def recommendations(self) -> list[str]:
        """Recommended corrective actions, one per violation, de-duplicated."""
        seen: list[str] = []
        for violation in self.violations:
            if violation.recommendation not in seen:
                seen.append(violation.recommendation)
        return seen
