"""Incident Report service layer for SafeFusion AI.

Loads an incident and runs it through the ``IncidentReportGenerator`` to
produce a structured, six-section report, optionally enriched with
Compound Risk, Emergency Response, and Compliance engine output for the
same incident/zone. Purely rule-based — no AI/ML, no PDF generation.
This module has no SQL or HTTP concerns of its own.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.models.incident import Incident
from src.services.compliance.schemas import IncidentComplianceResult
from src.services.compound_risk.schemas import ZoneCompoundRiskResult
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult
from src.services.incident_report.generator import IncidentReportGenerator
from src.services.incident_report.schemas import IncidentReport


class IncidentRepositoryPort(Protocol):
    """Repository contract required by ``IncidentReportService`` to load an incident."""

    def get_by_id(self, record_id: UUID) -> Incident | None: ...

    def get_most_recent(self) -> Incident | None: ...


class CompoundRiskPort(Protocol):
    """Compound Risk contract required by ``IncidentReportService``."""

    def detect_compound_risks(self) -> list[ZoneCompoundRiskResult]: ...


class EmergencyResponsePort(Protocol):
    """Emergency Response contract required by ``IncidentReportService``."""

    def respond(self, zone_results: list[ZoneCompoundRiskResult]) -> list[ZoneEmergencyResponseResult]: ...


class CompliancePort(Protocol):
    """Compliance contract required by ``IncidentReportService``."""

    def evaluate_incident(self, incident: Incident) -> IncidentComplianceResult: ...


class IncidentReportService:
    """Orchestrates incident report generation for a single incident."""

    def __init__(
        self,
        generator: IncidentReportGenerator,
        incident_repository: IncidentRepositoryPort,
        compound_risk: CompoundRiskPort | None = None,
        emergency_response: EmergencyResponsePort | None = None,
        compliance: CompliancePort | None = None,
    ) -> None:
        self._generator = generator
        self._incident_repository = incident_repository
        self._compound_risk = compound_risk
        self._emergency_response = emergency_response
        self._compliance = compliance

    def generate_report(self, incident_id: UUID) -> IncidentReport | None:
        """Load the incident by id and generate its structured report.

        Returns ``None`` if the incident does not exist. Compound Risk,
        Emergency Response, and Compliance sections are populated only
        for the ports that were supplied at construction time; a missing
        port simply leaves the corresponding section empty rather than
        raising.
        """
        incident = self._incident_repository.get_by_id(incident_id)
        if incident is None:
            return None
        return self.generate_report_for_incident(incident)

    def generate_latest_report(self) -> IncidentReport | None:
        """Generate a structured report for the most recently occurred incident.

        Returns ``None`` if no incidents have been recorded yet.
        """
        incident = self._incident_repository.get_most_recent()
        if incident is None:
            return None
        return self.generate_report_for_incident(incident)

    def generate_report_for_incident(self, incident: Incident) -> IncidentReport:
        """Generate a report for an already-loaded incident."""
        compound_risk_results = self._compound_risk.detect_compound_risks() if self._compound_risk else []

        emergency_response_results: list[ZoneEmergencyResponseResult] = []
        if self._emergency_response is not None:
            emergency_response_results = self._emergency_response.respond(compound_risk_results)

        compliance_result = self._compliance.evaluate_incident(incident) if self._compliance else None

        return self._generator.generate(
            incident=incident,
            compound_risk_results=compound_risk_results,
            emergency_response_results=emergency_response_results,
            compliance_result=compliance_result,
        )
