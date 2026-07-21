"""Emergency Response service layer for SafeFusion AI.

Accepts Compound Risk Engine output, runs it through the configurable
``EmergencyResponseEngine`` to map risk conditions to predefined emergency
actions, and executes those actions. Purely rule-based — no AI/ML
involved. Every action except ``generate_incident`` is a structured,
logged dispatch record (no external notification/SCADA integration exists
in this codebase yet); ``generate_incident`` persists via the existing
Incident repository so generated incidents show up in the standard
Incident APIs. This module has no direct SQL or HTTP concerns of its own.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Protocol

from src.config.settings import settings
from src.models.enums import EmergencyActionType, IncidentType, SeverityLevel
from src.models.incident import Incident
from src.services.compound_risk.schemas import ZoneCompoundRiskResult
from src.services.emergency_response.engine import EmergencyResponseEngine
from src.services.emergency_response.schemas import (
    EmergencyActionMatch,
    ZoneEmergencyResponseResult,
)
from src.utils.logger import get_logger

logger = get_logger(__name__)

# Maps a zone's compound RiskLevel to the Incident severity/type used when
# the "Generate Incident" action fires. Kept local to this service since
# it is specific to how emergency response translates risk into an
# incident record, not a general-purpose risk rule.
_RISK_LEVEL_TO_INCIDENT_SEVERITY: dict[str, SeverityLevel] = {
    "low": SeverityLevel.LOW,
    "medium": SeverityLevel.MEDIUM,
    "high": SeverityLevel.HIGH,
    "critical": SeverityLevel.CRITICAL,
}


class IncidentRepositoryPort(Protocol):
    """Minimal repository contract required to persist a generated incident."""

    def create(self, data: dict) -> Incident: ...

    def exists_since(self, zone: str, incident_type: IncidentType, since: datetime) -> bool: ...


class EmergencyResponseService:
    """Orchestrates emergency action dispatch across zones flagged by compound risk."""

    def __init__(
        self,
        engine: EmergencyResponseEngine,
        incident_repository: IncidentRepositoryPort | None = None,
    ) -> None:
        self._engine = engine
        self._incident_repository = incident_repository

    def evaluate(
        self, zone_results: list[ZoneCompoundRiskResult]
    ) -> list[ZoneEmergencyResponseResult]:
        """Map Compound Risk Engine output to emergency actions without dispatching them.

        Pure, side-effect-free — no incident is persisted and no action is
        logged as dispatched. Use this for any read-only view that needs
        the same zone/action data ``respond()`` produces (status snapshots,
        recommendations, incident reports) without triggering a real
        dispatch. Only ``respond()`` should be called from a flow that is
        actually meant to execute emergency actions.

        Args:
            zone_results: Output of the Compound Risk Engine.

        Returns:
            One ``ZoneEmergencyResponseResult`` per zone with at least one
            matched action, sorted by risk score descending.
        """
        return self._engine.evaluate(zone_results)

    def respond(
        self, zone_results: list[ZoneCompoundRiskResult]
    ) -> list[ZoneEmergencyResponseResult]:
        """Evaluate Compound Risk Engine output and execute the resulting actions.

        Args:
            zone_results: Output of the Compound Risk Engine.

        Returns:
            One ``ZoneEmergencyResponseResult`` per zone with at least one
            dispatched action, sorted by risk score descending.
        """
        results = self._engine.evaluate(zone_results)
        for result in results:
            for match in result.actions:
                self._execute(result, match)
        return results

    def _execute(self, result: ZoneEmergencyResponseResult, match: EmergencyActionMatch) -> None:
        """Execute a single dispatched action.

        ``generate_incident`` persists an Incident record; every other
        action is recorded as a structured log entry, which is the
        integration point future notification/SCADA adapters would hook
        into without changing this service's public contract.
        """
        if match.action == EmergencyActionType.GENERATE_INCIDENT:
            self._generate_incident(result, match)
            return

        logger.warning(
            "Emergency action dispatched: action=%s zone=%s risk_score=%.2f "
            "risk_level=%s rule=%s explanation=%s",
            match.action.value,
            result.zone,
            result.risk_score,
            result.risk_level.value,
            match.triggered_by_rule,
            match.explanation,
        )

    def _generate_incident(
        self, result: ZoneEmergencyResponseResult, match: EmergencyActionMatch
    ) -> Incident | None:
        if self._incident_repository is None:
            logger.warning(
                "Emergency action 'generate_incident' triggered for zone=%s but no "
                "incident repository is configured; skipping persistence.",
                result.zone,
            )
            return None

        cooldown_start = datetime.now(UTC) - timedelta(
            seconds=settings.EMERGENCY_GENERATE_INCIDENT_COOLDOWN_SECONDS
        )
        if self._incident_repository.exists_since(
            zone=result.zone, incident_type=IncidentType.EMERGENCY_RESPONSE, since=cooldown_start
        ):
            # A zone whose risk score stays above threshold across many
            # consecutive evaluations (every ~1s scenario tick, or every
            # poll of the real /monitoring route) would otherwise get a
            # brand-new Incident row every single time — suppress repeats
            # within the cooldown window, same as a real alerting system
            # not re-paging on an already-open incident.
            return None

        severity = _RISK_LEVEL_TO_INCIDENT_SEVERITY.get(result.risk_level.value, SeverityLevel.HIGH)
        incident = self._incident_repository.create(
            {
                "zone": result.zone,
                "severity": severity,
                "incident_type": IncidentType.EMERGENCY_RESPONSE,
                "description": (
                    f"Auto-generated by Emergency Response Engine: {result.explanation}"
                ),
                "root_cause": match.explanation,
                "occurred_at": datetime.now(UTC),
            }
        )
        logger.warning(
            "Emergency action dispatched: action=generate_incident zone=%s "
            "incident_id=%s risk_score=%.2f risk_level=%s",
            result.zone,
            incident.id,
            result.risk_score,
            result.risk_level.value,
        )
        return incident
