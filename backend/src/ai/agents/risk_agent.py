"""Risk Agent — zone risk assessment from live monitoring + compound risk detection.

Consumes two engines, each reached through a narrow Protocol port (never
the concrete ``src.services.*`` class) so this agent stays constructible
in tests with fakes and wireable in production with the real services —
the same seam every other agent/service in this codebase uses:

    - :class:`MonitoringEnginePort` — sensor and worker monitoring
      summaries (:class:`~src.services.sensor_monitoring.SensorMonitoringService`,
      :class:`~src.services.worker_monitoring.WorkerMonitoringService`).
      Individual out-of-band sensor readings are the source of
      :class:`Hazard` entries in the returned assessment.
    - :class:`CompoundRiskEnginePort` — :class:`~src.services.compound_risk.compound_risk_service.CompoundRiskService`,
      which correlates sensor/worker/permit signals into a per-zone risk
      score, risk level, and triggered rules. Triggered rules are the
      source of :attr:`RiskAssessment.reasoning`.

No FastAPI import anywhere in this module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from src.ai.agents.base import AgentRequest, AgentResult
from src.utils.logger import get_logger

logger = get_logger(__name__)


# ── Engine ports ──────────────────────────────────────────────────────────────


class MonitoringEnginePort(Protocol):
    """Contract required from the sensor/worker monitoring layer.

    Matches the ``get_monitoring_summary()`` shape already returned by
    :class:`~src.services.sensor_monitoring.SensorMonitoringService` and
    :class:`~src.services.worker_monitoring.WorkerMonitoringService` —
    see those modules for the concrete dict shape (``sensors``: list of
    per-reading dicts with ``zone``/``sensor_type``/``value``/``computed_status``;
    ``workers``: list of per-worker dicts with ``assigned_zone``).
    """

    def get_sensor_summary(self) -> dict: ...

    def get_worker_summary(self) -> dict: ...


class CompoundRiskEnginePort(Protocol):
    """Contract required from the compound risk service."""

    def detect_compound_risks(self) -> list[object]: ...


# ── Result shape ──────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class Hazard:
    """A single detected hazard condition feeding into a zone's risk assessment.

    Attributes:
        zone: Zone the hazard was observed in.
        description: Human-readable description of the hazard.
        severity: ``"warning"`` or ``"critical"`` — mirrors
            :class:`~src.models.enums.SensorStatus`, excluding ``"normal"``
            since normal readings aren't hazards.
        source: Where this hazard was detected — ``"sensor"`` or
            ``"worker_presence"`` today; new monitoring inputs add new
            source values without changing this schema.
    """

    zone: str
    description: str
    severity: str
    source: str


@dataclass(frozen=True, slots=True)
class RiskAssessment:
    """Structured risk assessment for a single zone.

    The first five fields are the agent's actual output contract — the
    exact fields requested of the Risk Agent.
    :class:`~src.ai.agents.base.AgentResult.data` carries a
    ``list[RiskAssessment]``, one per zone the Compound Risk Engine
    flagged.

    Attributes:
        raw_compound_risk_result: The originating
            ``ZoneCompoundRiskResult`` this assessment was built from.
            Not part of the requested public contract — kept only so
            the supervisor's Risk -> Emergency handoff (see
            ``src/ai/agents/supervisor.py``) can pass a real engine
            result to :class:`~src.ai.agents.emergency_agent.EmergencyAgent`
            without the Risk agent duplicating a second call to the
            Compound Risk Engine.
    """

    zone: str
    risk_level: str
    risk_score: float
    detected_hazards: list[Hazard]
    reasoning: list[str]
    recommendations: list[str] = field(default_factory=list)
    raw_compound_risk_result: object = None


# ── Recommendation policy ─────────────────────────────────────────────────────

# Maps a triggered compound-risk rule name to the corrective action an
# operator should take. Kept as a lookup table (not branching logic) so
# adding a rule's recommendation is a data change, not a code change —
# mirrors the "no hardcoded workflow" approach used by the supervisor's
# routing table. Rule names come from
# ``src.services.compound_risk.rules`` (see that module for the
# conditions each rule fires on).
_RULE_RECOMMENDATIONS: dict[str, str] = {
    "critical_sensor_without_active_permit": (
        "Issue or verify an active permit for the zone, or stop work until one is in place."
    ),
    "expired_permit_with_worker_present": (
        "Withdraw workers from the zone immediately and renew the permit before work resumes."
    ),
    "critical_sensor_with_worker_present": (
        "Evacuate personnel from the zone and dispatch a safety officer to investigate the reading."
    ),
    "restricted_zone_without_active_permit": (
        "Remove unauthorized personnel from the restricted zone and enforce permit-gated entry."
    ),
    "multiple_warning_sensors": (
        "Inspect the zone's monitored systems for a developing fault before conditions escalate."
    ),
}

_DEFAULT_RECOMMENDATION = "Continue routine monitoring; no corrective action required at this time."


class RiskAgent:
    """Reports per-zone risk level, score, hazards, reasoning, and recommendations."""

    def __init__(self, monitoring_engine: MonitoringEnginePort, compound_risk_engine: CompoundRiskEnginePort) -> None:
        self._monitoring_engine = monitoring_engine
        self._compound_risk_engine = compound_risk_engine

    @property
    def name(self) -> str:
        return "risk"

    def run(self, request: AgentRequest) -> AgentResult:
        del request  # zone-scoped filtering not yet implemented; evaluates all zones
        try:
            hazards_by_zone = self._detect_hazards()
            risk_results = self._compound_risk_engine.detect_compound_risks()
        except Exception as exc:  # noqa: BLE001 - one agent's failure must not abort the others
            logger.warning("Risk agent failed: %s", exc)
            return AgentResult(agent=self.name, summary="", error=str(exc))

        if not risk_results:
            return AgentResult(agent=self.name, summary="No compound risk conditions detected.", data=[])

        assessments = [
            _build_assessment(result, hazards_by_zone.get(result.zone, [])) for result in risk_results
        ]

        summary = "; ".join(
            f"{assessment.zone}: {assessment.risk_level} ({assessment.risk_score:.0f})"
            for assessment in assessments
        )
        return AgentResult(
            agent=self.name,
            summary=f"Compound risk detected in {len(assessments)} zone(s): {summary}",
            data=assessments,
        )

    def _detect_hazards(self) -> dict[str, list[Hazard]]:
        """Pull raw monitoring summaries and extract out-of-band conditions as hazards.

        Distinct from the Compound Risk Engine's *correlated* rule
        matches: this is the flat list of individually abnormal
        readings, before any cross-signal correlation. A zone can have
        hazards here with no compound risk result (e.g. a single
        warning sensor, no permit/worker overlap) — the Compound Risk
        Engine's ``triggered_rules`` is what explains *why* a zone made
        it into the returned assessments at all.
        """
        sensor_summary = self._monitoring_engine.get_sensor_summary()
        # get_worker_summary() is part of MonitoringEnginePort for when
        # worker-presence hazards (e.g. workers in a zone with no active
        # permit) are added here; not yet consumed.

        hazards: dict[str, list[Hazard]] = {}
        for sensor in sensor_summary.get("sensors", []):
            status = sensor.get("computed_status")
            if status not in ("warning", "critical"):
                continue
            zone = sensor["zone"]
            hazards.setdefault(zone, []).append(
                Hazard(
                    zone=zone,
                    description=(
                        f"{sensor['sensor_type']} reading of {sensor['value']}{sensor.get('unit') or ''} "
                        f"is {status}"
                    ),
                    severity=status,
                    source="sensor",
                )
            )

        return hazards


def _build_assessment(risk_result: object, hazards: list[Hazard]) -> RiskAssessment:
    """Combine one Compound Risk Engine result with its zone's detected hazards."""
    reasoning = [match.explanation for match in risk_result.triggered_rules] or [
        "No compound risk rules triggered for this zone; score reflects baseline monitoring only."
    ]
    recommendations = list(
        dict.fromkeys(
            _RULE_RECOMMENDATIONS.get(match.rule_name, _DEFAULT_RECOMMENDATION)
            for match in risk_result.triggered_rules
        )
    ) or [_DEFAULT_RECOMMENDATION]

    return RiskAssessment(
        zone=risk_result.zone,
        risk_level=risk_result.risk_level.value,
        risk_score=risk_result.risk_score,
        detected_hazards=hazards,
        reasoning=reasoning,
        recommendations=recommendations,
        raw_compound_risk_result=risk_result,
    )
