"""Compliance service layer for SafeFusion AI.

Accepts detected incidents (directly, or pulled via a repository port) and
runs them through the configurable ``ComplianceRuleEngine`` to evaluate
Factory Act, OISD, and DGMS compliance, returning per-incident compliance
status, violated rules, and recommendations. Purely rule-based — no
AI/ML involved. This module has no SQL or HTTP concerns of its own.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from src.models.incident import Incident
from src.services.compliance.engine import ComplianceRuleEngine
from src.services.compliance.schemas import IncidentComplianceResult


class IncidentRepositoryPort(Protocol):
    """Repository contract required by ``ComplianceService`` to pull incidents."""

    def get_by_id(self, record_id: UUID) -> Incident | None: ...

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Incident]: ...


class ComplianceService:
    """Orchestrates compliance evaluation of detected incidents."""

    def __init__(
        self,
        engine: ComplianceRuleEngine,
        incident_repository: IncidentRepositoryPort | None = None,
    ) -> None:
        self._engine = engine
        self._incident_repository = incident_repository

    def evaluate_incident(self, incident: Incident) -> IncidentComplianceResult:
        """Evaluate a single, already-loaded incident against every compliance rule."""
        return self._engine.evaluate(incident)

    def evaluate_incident_by_id(self, incident_id: UUID) -> IncidentComplianceResult | None:
        """Load an incident by id via the repository and evaluate it.

        Returns ``None`` if no repository is configured or the incident
        does not exist.
        """
        if self._incident_repository is None:
            return None
        incident = self._incident_repository.get_by_id(incident_id)
        if incident is None:
            return None
        return self._engine.evaluate(incident)

    def evaluate_all_incidents(self, skip: int = 0, limit: int = 100) -> list[IncidentComplianceResult]:
        """Evaluate every incident returned by the repository (paginated).

        Returns an empty list if no repository is configured.
        """
        if self._incident_repository is None:
            return []
        incidents = self._incident_repository.get_all(skip=skip, limit=limit)
        return self._engine.evaluate_many(incidents)
