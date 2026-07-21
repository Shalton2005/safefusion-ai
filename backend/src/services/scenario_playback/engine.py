"""Demo Scenario Playback Engine.

Advances a :class:`~src.services.scenario_playback.schemas.ScenarioTimeline`
one row at a time and, on each advance, persists that row's state as real
``Sensor``/``Worker``/``Permit``/``Incident`` rows via the existing
repositories, publishes the same events the live sensor/worker/permit
domains publish, and then runs the *exact* production rule chain used by
``src.routes.monitoring``/``emergency_response``/``compliance``/
``alerts`` — Compound Risk -> Emergency Response -> Compliance -> Alert
Generation — against the monitoring summaries built from what was just
persisted.

Deliberately does **not** write to Recommendations, Risk Scores, or the
Timeline directly: every dashboard endpoint that shows those recomputes
them live from the DB (Recommendations from Compound Risk/Emergency/
Compliance results, same as ``src.routes.recommendations``) or from the
Unified Event Bus (Timeline, via the process-wide subscriber registered in
``server.py``), so persisting the primary domain tables here is
sufficient for every dashboard panel to update on its next poll — no
dashboard value is ever computed or written directly by this engine.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from src.config.compliance_rules import COMPLIANCE_RULES
from src.config.risk_rules import COMPOUND_RISK_LEVEL_BANDS, COMPOUND_RISK_RULES, EMERGENCY_RESPONSE_RULES
from src.config.settings import settings
from src.models.enums import EmergencyActionType, PermitStatus, SensorType, WorkerStatus
from src.repositories.alert import AlertRepository
from src.repositories.incident import IncidentRepository
from src.repositories.permit import PermitRepository
from src.repositories.sensor import SensorRepository
from src.repositories.worker import WorkerRepository
from src.services.alert_generation import AlertGenerationService
from src.services.alert_rules import AlertRuleEngine, CriticalSensorRule, ExpiredPermitRule, RestrictedZoneRule
from src.services.compliance.compliance_service import ComplianceService
from src.services.compliance.engine import ComplianceRuleEngine
from src.services.compliance.rules import IncidentAttributeComplianceRule
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.compound_risk.engine import CompoundRiskEngine
from src.services.compound_risk.rules import (
    CameraCriticalDetectionWithoutActivePermitRule,
    CriticalSensorNearDegradedEquipmentRule,
    CriticalSensorWithoutActivePermitRule,
    CriticalSensorWithWorkerPresentRule,
    DegradedEquipmentWithWorkerPresentRule,
    ExpiredPermitWithWorkerPresentRule,
    MultipleWarningSensorsRule,
    PPEViolationWithWorkerPresentRule,
    RestrictedZoneWithoutActivePermitRule,
)
from src.services.compound_risk.schemas import CompoundRiskLevelBands, ZoneCompoundRiskResult
from src.services.computer_vision.camera_monitoring import get_default_camera_monitoring_service
from src.services.emergency_response.emergency_response_service import EmergencyResponseService
from src.services.emergency_response.engine import EmergencyResponseEngine
from src.services.emergency_response.rules import ThresholdEmergencyResponseRule
from src.services.emergency_response.schemas import ZoneEmergencyResponseResult
from src.services.event_bus.dispatcher import EventDispatcher
from src.services.event_bus.payloads import PermitEventPayload, SensorEventPayload, WorkerEventPayload
from src.services.event_bus.publisher import EventPublisher
from src.services.event_bus.schemas import EventSource, EventType
from src.services.permit_validation import PermitValidationRules, PermitValidationService
from src.services.scenario_playback.schemas import ScenarioCvEvent, ScenarioRow, ScenarioTimeline
from src.services.sensor_monitoring import SensorMonitoringService, SensorThresholdBand, ThresholdSensorClassifier
from src.services.worker_monitoring import WorkerMonitoringService
from src.utils.logger import get_logger

logger = get_logger(__name__)

_sensor_classifier = ThresholdSensorClassifier()


def _sensor_thresholds_from_settings() -> dict[SensorType, SensorThresholdBand]:
    """Mirror ``src.routes.monitoring._sensor_thresholds_from_settings`` exactly."""
    return {
        SensorType.GAS: SensorThresholdBand(
            warning_max=settings.SENSOR_GAS_WARNING_MAX, critical_max=settings.SENSOR_GAS_CRITICAL_MAX
        ),
        SensorType.TEMPERATURE: SensorThresholdBand(
            warning_max=settings.SENSOR_TEMPERATURE_WARNING_MAX,
            critical_max=settings.SENSOR_TEMPERATURE_CRITICAL_MAX,
        ),
        SensorType.PRESSURE: SensorThresholdBand(
            warning_max=settings.SENSOR_PRESSURE_WARNING_MAX,
            critical_max=settings.SENSOR_PRESSURE_CRITICAL_MAX,
        ),
        SensorType.HUMIDITY: SensorThresholdBand(
            warning_max=settings.SENSOR_HUMIDITY_WARNING_MAX,
            critical_max=settings.SENSOR_HUMIDITY_CRITICAL_MAX,
        ),
        SensorType.SMOKE: SensorThresholdBand(
            warning_max=settings.SENSOR_SMOKE_WARNING_MAX, critical_max=settings.SENSOR_SMOKE_CRITICAL_MAX
        ),
    }


def _permit_validation_rules() -> PermitValidationRules:
    """Mirror ``src.routes.monitoring._permit_validation_rules`` exactly."""
    return PermitValidationRules(
        valid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_VALID_STATUSES},
        pending_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_PENDING_STATUSES},
        invalid_statuses={PermitStatus(value) for value in settings.PERMIT_VALIDATION_INVALID_STATUSES},
        expired_grace_seconds=settings.PERMIT_VALIDATION_EXPIRED_GRACE_SECONDS,
    )


def _build_compound_risk_engine() -> CompoundRiskEngine:
    """Mirror ``src.services.demo_scenarios.engines.build_compound_risk_engine`` (production rule set)."""
    rules = COMPOUND_RISK_RULES
    zone_map = dict(settings.EQUIPMENT_ZONE_MAP)
    engine_rules: list = [
        CriticalSensorWithoutActivePermitRule(points=rules["critical_sensor_without_active_permit"].points),
        ExpiredPermitWithWorkerPresentRule(points=rules["expired_permit_with_worker_present"].points),
        CriticalSensorWithWorkerPresentRule(points=rules["critical_sensor_with_worker_present"].points),
        RestrictedZoneWithoutActivePermitRule(
            points=rules["restricted_zone_without_active_permit"].points,
            restricted_zones=rules["restricted_zone_without_active_permit"].params["restricted_zones"],
        ),
        MultipleWarningSensorsRule(
            points=rules["multiple_warning_sensors"].points,
            minimum_warning_count=rules["multiple_warning_sensors"].params["minimum_warning_count"],
        ),
        DegradedEquipmentWithWorkerPresentRule(
            points=rules["degraded_equipment_with_worker_present"].points, equipment_zone_map=zone_map
        ),
        CriticalSensorNearDegradedEquipmentRule(
            points=rules["critical_sensor_near_degraded_equipment"].points, equipment_zone_map=zone_map
        ),
        CameraCriticalDetectionWithoutActivePermitRule(
            points=rules["camera_critical_detection_without_active_permit"].points,
        ),
        PPEViolationWithWorkerPresentRule(
            points=rules["ppe_violation_with_worker_present"].points,
            minimum_severity_rank=rules["ppe_violation_with_worker_present"].params["minimum_severity_rank"],
        ),
    ]
    return CompoundRiskEngine(
        rules=engine_rules, level_bands=CompoundRiskLevelBands(**COMPOUND_RISK_LEVEL_BANDS)
    )


def _build_emergency_response_engine() -> EmergencyResponseEngine:
    rule_name_to_action = {
        "notify_safety_officer": EmergencyActionType.NOTIFY_SAFETY_OFFICER,
        "notify_control_room": EmergencyActionType.NOTIFY_CONTROL_ROOM,
        "stop_work": EmergencyActionType.STOP_WORK,
        "isolate_equipment": EmergencyActionType.ISOLATE_EQUIPMENT,
        "evacuate_area": EmergencyActionType.EVACUATE_AREA,
        "generate_incident": EmergencyActionType.GENERATE_INCIDENT,
    }
    engine_rules = [
        ThresholdEmergencyResponseRule(
            rule_name=rule_name, action=rule_name_to_action[rule_name], threshold=rule.points
        )
        for rule_name, rule in EMERGENCY_RESPONSE_RULES.items()
    ]
    return EmergencyResponseEngine(rules=engine_rules)


def _build_compliance_engine() -> ComplianceRuleEngine:
    return ComplianceRuleEngine(rules=[IncidentAttributeComplianceRule(config) for config in COMPLIANCE_RULES.values()])


@dataclass
class ScenarioPlaybackState:
    """Snapshot of a playback run's progress, for the ``/demo/status`` route."""

    scenario_name: str
    running: bool
    elapsed_seconds: float
    total_seconds: float
    current_row_index: int
    current_row_label: str | None
    video_filename: str | None = None
    #: The scenario's zone name (e.g. "Zone-D") — used to look up a
    #: restricted-zone polygon for the real-time video detection overlay
    #: (see ``src.services.scenario_playback.video_detection.RESTRICTED_ZONES``).
    zone: str | None = None
    last_tick_at: datetime | None = None
    compound_risk_results: list[ZoneCompoundRiskResult] = field(default_factory=list)
    emergency_response_results: list[ZoneEmergencyResponseResult] = field(default_factory=list)
    #: Currently active scripted CV overlay boxes (see
    #: ``schemas.ScenarioCvEvent``) — the most recent row's ``cv_events``,
    #: carried forward under the same sparse-patch rule as every other row
    #: field until a later row replaces or clears them.
    cv_events: tuple[ScenarioCvEvent, ...] = ()


class ScenarioPlaybackEngine:
    """Replays one loaded ``ScenarioTimeline`` into the database, one tick at a time.

    Holds a small amount of process-wide in-memory state across ticks —
    the DB-assigned UUIDs for the scenario's one worker/permit row, so
    later ticks *update* the same row instead of creating a duplicate each
    time (mirroring how ``CameraMonitoringService`` keeps process-wide
    state for a domain with no natural per-request scope). This mirrors
    ``src.services.demo_scenarios`` reusing the exact production rule
    chain (see module docstring there), extended to actually persist and
    replay over real time instead of evaluating one fixed snapshot once.
    """

    def __init__(self, timeline: ScenarioTimeline, dispatcher: EventDispatcher) -> None:
        self._timeline = timeline
        self._dispatcher = dispatcher
        self._elapsed_seconds: float = 0.0
        self._current_row_index: int = -1
        self._worker_id: UUID | None = None
        self._permit_id: UUID | None = None
        self._sensor_status: dict[str, float] = {}
        self._last_worker_status = None
        self._last_ppe_status: bool | None = None
        self._last_permit_status = None
        self._cv_events: tuple[ScenarioCvEvent, ...] = ()
        self.last_compound_risk_results: list[ZoneCompoundRiskResult] = []
        self.last_emergency_response_results: list[ZoneEmergencyResponseResult] = []

    @property
    def timeline(self) -> ScenarioTimeline:
        return self._timeline

    @property
    def elapsed_seconds(self) -> float:
        return self._elapsed_seconds

    @property
    def current_row_index(self) -> int:
        return self._current_row_index

    @property
    def is_finished(self) -> bool:
        return self._elapsed_seconds > self._timeline.duration_seconds

    def _rows_due(self) -> list[tuple[int, ScenarioRow]]:
        """Every ``(index, row)`` whose ``t`` has been reached but not yet applied."""
        due: list[tuple[int, ScenarioRow]] = []
        for index, row in enumerate(self._timeline.rows):
            if index > self._current_row_index and row.t <= self._elapsed_seconds:
                due.append((index, row))
        return due

    def tick(self, db: Session, tick_seconds: float = 1.0) -> ScenarioPlaybackState:
        """Advance the timeline by ``tick_seconds`` and persist any newly due rows.

        Runs the full production rule chain — Compound Risk, Emergency
        Response, Compliance, Alert Generation — against the *live*
        database state after persisting, every tick (not only on rows
        with new data), so a zone's condition (e.g. an elevated sensor
        reading from three rows ago) continues to be correctly reflected
        even between narrative beats.
        """
        self._elapsed_seconds += tick_seconds

        for index, row in self._rows_due():
            self._apply_row(db, row)
            self._current_row_index = index

        self._run_rule_chain(db)

        current_row = (
            self._timeline.rows[self._current_row_index] if self._current_row_index >= 0 else None
        )
        return ScenarioPlaybackState(
            scenario_name=self._timeline.name,
            running=True,
            elapsed_seconds=self._elapsed_seconds,
            total_seconds=self._timeline.duration_seconds,
            current_row_index=self._current_row_index,
            current_row_label=current_row.label if current_row else None,
            video_filename=self._timeline.video_filename,
            zone=self._timeline.zone,
            last_tick_at=datetime.now(UTC),
            compound_risk_results=self.last_compound_risk_results,
            emergency_response_results=self.last_emergency_response_results,
            cv_events=self._cv_events,
        )

    # ── Row application ──────────────────────────────────────────────────

    def _apply_row(self, db: Session, row: ScenarioRow) -> None:
        logger.info(
            "Scenario %r row t=%.0fs due: %s", self._timeline.name, row.t, row.label or "(unlabeled)"
        )

        if row.cv_events is not None:
            self._cv_events = row.cv_events

        sensor_repo = SensorRepository(db)
        worker_repo = WorkerRepository(db)
        permit_repo = PermitRepository(db)

        sensor_publisher = EventPublisher(self._dispatcher, source=EventSource.SENSOR)
        worker_publisher = EventPublisher(self._dispatcher, source=EventSource.WORKER)
        permit_publisher = EventPublisher(self._dispatcher, source=EventSource.PERMIT)

        thresholds = _sensor_thresholds_from_settings()
        for reading in row.sensors:
            sensor_type = SensorType(reading.sensor_type)
            band = thresholds.get(sensor_type, SensorThresholdBand())
            status = _sensor_classifier.classify(reading.value, band)
            created = sensor_repo.create(
                {
                    "zone": self._timeline.zone,
                    "sensor_type": sensor_type,
                    "value": reading.value,
                    "unit": reading.unit,
                    "status": status,
                }
            )
            self._sensor_status[reading.sensor_id] = reading.value
            sensor_publisher.publish(
                EventType.CREATED,
                payload=SensorEventPayload(
                    sensor_id=created.id,
                    sensor_type=sensor_type.value,
                    value=reading.value,
                    unit=reading.unit,
                    status=status.value,
                ).as_dict(),
                zone=self._timeline.zone,
                correlation_id=self._timeline.name,
            )

        if self._worker_id is None:
            worker = worker_repo.get_by_employee_id(self._timeline.worker.employee_id)
            if worker is None:
                worker = worker_repo.create(
                    {
                        "name": self._timeline.worker.name,
                        "employee_id": self._timeline.worker.employee_id,
                        "department": self._timeline.worker.department,
                        "role": self._timeline.worker.role,
                        "current_zone": self._timeline.zone,
                        "ppe_status": True,
                        "shift": self._timeline.worker.shift,
                    }
                )
            self._worker_id = worker.id

        if row.worker_status is not None or row.ppe_status is not None:
            update: dict = {"current_zone": self._timeline.zone}
            if row.worker_status is not None:
                update["status"] = row.worker_status
                self._last_worker_status = row.worker_status
            if row.ppe_status is not None:
                update["ppe_status"] = row.ppe_status
                self._last_ppe_status = row.ppe_status
            worker_repo.update(self._worker_id, update)
            current_status = self._last_worker_status or WorkerStatus.WORKING
            worker_publisher.publish(
                EventType.UPDATED,
                payload=WorkerEventPayload(
                    worker_id=self._worker_id,
                    employee_id=self._timeline.worker.employee_id,
                    status=current_status.value,
                    current_zone=self._timeline.zone,
                ).as_dict(),
                zone=self._timeline.zone,
                correlation_id=self._timeline.name,
            )

        if self._permit_id is None:
            now = datetime.now(UTC)
            permit = permit_repo.create(
                {
                    "permit_type": self._timeline.permit.permit_type,
                    "zone": self._timeline.zone,
                    "issued_by": self._timeline.permit.issued_by,
                    "assigned_team": self._timeline.permit.assigned_team,
                    "start_time": now + timedelta(hours=self._timeline.permit.start_offset_hours),
                    "end_time": now + timedelta(hours=self._timeline.permit.end_offset_hours),
                    "status": PermitStatus.ACTIVE,
                }
            )
            self._permit_id = permit.id
            self._last_permit_status = PermitStatus.ACTIVE

        if row.permit_status is not None:
            permit_repo.update(self._permit_id, {"status": row.permit_status})
            self._last_permit_status = row.permit_status
            permit_publisher.publish(
                EventType.UPDATED,
                payload=PermitEventPayload(
                    permit_id=self._permit_id,
                    permit_type=self._timeline.permit.permit_type.value,
                    status=row.permit_status.value,
                ).as_dict(),
                zone=self._timeline.zone,
                correlation_id=self._timeline.name,
            )

        if row.incident is not None:
            incident_repo = IncidentRepository(db)
            incident_repo.create(
                {
                    "zone": self._timeline.zone,
                    "severity": row.incident.severity,
                    "incident_type": row.incident.incident_type,
                    "description": row.incident.description,
                    "root_cause": row.incident.root_cause,
                    "occurred_at": datetime.now(UTC),
                }
            )

    # ── Rule chain ────────────────────────────────────────────────────────

    def _run_rule_chain(self, db: Session) -> None:
        """Run the production Compound Risk -> Emergency Response -> Compliance -> Alerts chain.

        Every service/engine here is constructed exactly as its live route
        module (``src.routes.monitoring``/``emergency_response``/
        ``compliance``/``alerts``) constructs it, against the same
        DB-backed repositories — so this reproduces what those endpoints
        would compute for the current DB state, without duplicating rule
        logic.
        """
        sensor_monitoring = SensorMonitoringService(
            repository=SensorRepository(db), thresholds=_sensor_thresholds_from_settings()
        )
        permit_repository = PermitRepository(db)
        permit_validation = PermitValidationService(rules=_permit_validation_rules())
        worker_monitoring = WorkerMonitoringService(
            worker_repository=WorkerRepository(db), permit_repository=permit_repository
        )

        class _PermitSummaryAdapter:
            def get_validation_summary(self) -> dict:
                permits = permit_repository.get_all(skip=0, limit=10_000)
                return permit_validation.build_validation_summary(permits)

        compound_risk_service = CompoundRiskService(
            engine=_build_compound_risk_engine(),
            sensor_monitoring=sensor_monitoring,
            camera_monitoring=get_default_camera_monitoring_service(),
            worker_monitoring=worker_monitoring,
            permit_validation=_PermitSummaryAdapter(),
        )
        compound_risk_results = compound_risk_service.detect_compound_risks()
        self.last_compound_risk_results = compound_risk_results

        emergency_response_service = EmergencyResponseService(
            engine=_build_emergency_response_engine(), incident_repository=IncidentRepository(db)
        )
        
        new_emergency_results = emergency_response_service.evaluate(compound_risk_results)
        
        # Deduplicate dispatching to prevent 1-second spam for seeded background zones:
        # only call respond() for zones whose triggered emergency actions have changed.
        last_actions = {
            r.zone: {m.action for m in r.actions}
            for r in self.last_emergency_response_results
        }
        
        zones_to_dispatch = []
        for r in new_emergency_results:
            current_actions = {m.action for m in r.actions}
            if current_actions != last_actions.get(r.zone, set()):
                # Find the matching compound_risk_result to pass to respond()
                cr_result = next(cr for cr in compound_risk_results if cr.zone == r.zone)
                zones_to_dispatch.append(cr_result)
                
        if zones_to_dispatch:
            emergency_response_service.respond(zones_to_dispatch)
            
        self.last_emergency_response_results = new_emergency_results

        compliance_service = ComplianceService(
            engine=_build_compliance_engine(), incident_repository=IncidentRepository(db)
        )
        compliance_service.evaluate_all_incidents(skip=0, limit=500)

        alert_rule_engine = AlertRuleEngine(
            rules=[
                CriticalSensorRule(),
                ExpiredPermitRule(),
                RestrictedZoneRule(restricted_zones=set(settings.ALERT_RESTRICTED_ZONES)),
            ]
        )
        alert_generation_service = AlertGenerationService(
            repository=AlertRepository(db),
            rule_engine=alert_rule_engine,
            sensor_monitoring=sensor_monitoring,
            permit_validation=_PermitSummaryAdapter(),
            worker_monitoring=worker_monitoring,
        )
        alert_generation_service.generate_and_persist_alerts()
