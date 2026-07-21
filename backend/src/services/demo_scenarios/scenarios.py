"""The eight named deterministic demo scenarios for SafeFusion AI.

Each scenario mirrors one of the eight named situations seeded into
Postgres by ``scripts/seed_demo_data.py`` (same zones, same narrative,
same trigger conditions) — but as a pure, in-memory ``DemoScenario``
fixture with literal values instead of database rows. That keeps the demo
story consistent with what's already documented for this project while
making every scenario runnable with zero DB dependency, live-event
publishing, and guaranteed-identical AI recommendations on every run (see
``src.services.demo_scenarios.runner.DemoScenarioRunner``).

1. Normal Plant       (Control-Room)          — all sensors nominal, valid permit, worker present.
2. Gas Leak           (Tank-Farm-A)       — critical gas reading, worker present, valid permit.
3. Expired Permit     (Pump-House)          — nominal sensors, expired permit, worker present.
4. Compound Risk      (Boiler-Area)     — critical sensor + expired permit + worker present in
                                           a restricted zone, deliberately triggering several
                                           Compound Risk Engine rules at once.
5. Fire               (Loading-Bay)          — critical temperature/smoke readings, worker in
                                           emergency status, linked Incident record.
6. Permit Violation   (Cooling-Tower)          — worker performing hot work under a permit suspended
                                           mid-task, linked PPE_VIOLATION Incident record.
7. Worker Collapse    (Boiler-Unit-B-03)          — nominal sensors and a valid permit, but the assigned
                                           worker is down/unresponsive, linked Incident record.
8. Confined Space     (Confined-Space-CS-07)— a restricted zone with a critical gas reading, a
                                           worker present, and no valid permit for entry.
"""

from __future__ import annotations

from src.models.enums import (
    IncidentType,
    MaintenanceStatus,
    MaintenanceType,
    PermitStatus,
    PermitType,
    SensorStatus,
    SensorType,
    SeverityLevel,
    WorkerStatus,
)
from src.services.demo_scenarios.schemas import (
    DemoIncident,
    DemoMaintenanceLog,
    DemoPermit,
    DemoScenario,
    DemoSensorReading,
    DemoWorker,
)

NORMAL = DemoScenario(
    name="normal",
    title="Normal Plant",
    narrative=(
        "Control-Room: all sensors nominal, a valid permit covers the zone, and the "
        "assigned worker is on shift. Baseline case — both risk engines should "
        "report low/no risk here, giving the demo a clean control to contrast "
        "against every other scenario."
    ),
    zone="Control-Room",
    sensors=(
        DemoSensorReading("SEN-NORMAL-GAS", SensorType.GAS, 38.0, "ppm", SensorStatus.NORMAL),
        DemoSensorReading("SEN-NORMAL-TEMP", SensorType.TEMPERATURE, 28.5, "C", SensorStatus.NORMAL),
        DemoSensorReading("SEN-NORMAL-PRESSURE", SensorType.PRESSURE, 5.0, "bar", SensorStatus.NORMAL),
    ),
    workers=(
        DemoWorker(
            employee_id="EMP-1024",
            worker_id="WRK-1024",
            name="Pooja Das",
            department="Utilities",
            role="Control Room Operator",
            shift="Morning",
            status=WorkerStatus.WORKING,
        ),
    ),
    permits=(
        DemoPermit(
            permit_id="PTW-DEMO-NORMAL",
            permit_type=PermitType.HOT_WORK,
            issued_by="Safety Officer Reddy",
            assigned_team="Utilities Team Echo",
            status=PermitStatus.ACTIVE,
            start_offset_hours=-2.0,
            end_offset_hours=6.0,
        ),
    ),
)

GAS_LEAK = DemoScenario(
    name="gas_leak",
    title="Gas Leak",
    narrative=(
        "Tank-Farm-A: hydrocarbon vapor concentration spikes to a critical gas "
        "reading while a field operator remains on site under an active "
        "permit. Isolates a single-cause emergency — critical sensor with a "
        "worker present, no permit-related rule involved."
    ),
    zone="Tank-Farm-A",
    sensors=(
        DemoSensorReading("SEN-GASLEAK-GAS", SensorType.GAS, 95.0, "ppm", SensorStatus.CRITICAL),
        DemoSensorReading("SEN-GASLEAK-TEMP", SensorType.TEMPERATURE, 33.0, "C", SensorStatus.NORMAL),
        DemoSensorReading("SEN-GASLEAK-PRESSURE", SensorType.PRESSURE, 6.0, "bar", SensorStatus.NORMAL),
    ),
    workers=(
        DemoWorker(
            employee_id="EMP-1031",
            worker_id="WRK-1031",
            name="Vikram Singh",
            department="Operations",
            role="Field Operator",
            shift="Morning",
            status=WorkerStatus.EMERGENCY,
        ),
    ),
    permits=(
        DemoPermit(
            permit_id="PTW-DEMO-GASLEAK",
            permit_type=PermitType.CONFINED_SPACE,
            issued_by="Safety Officer Patel",
            assigned_team="Mechanical Team Bravo",
            status=PermitStatus.ACTIVE,
            start_offset_hours=-1.0,
            end_offset_hours=7.0,
        ),
    ),
    incidents=(
        DemoIncident(
            incident_id="INC-DEMO-GASLEAK",
            severity=SeverityLevel.CRITICAL,
            incident_type=IncidentType.GAS_LEAK,
            description=(
                "Hydrocarbon vapor concentration spiked to 95 ppm near the "
                "Tank-Farm-A transfer pump while a field operator remained on "
                "site under an active confined-space permit."
            ),
            root_cause=(
                "Suspected seal failure on the transfer line following a "
                "recent product changeover; vapor recovery unit unable to "
                "keep pace."
            ),
        ),
    ),
)

EXPIRED_PERMIT = DemoScenario(
    name="expired_permit",
    title="Expired Permit",
    narrative=(
        "Pump-House: sensors read entirely normal, but the permit covering the "
        "zone expired two hours ago while a worker remains assigned there. "
        "Isolates a compliance-only violation with no environmental signal."
    ),
    zone="Pump-House",
    sensors=(
        DemoSensorReading("SEN-EXPIREDPERMIT-GAS", SensorType.GAS, 40.0, "ppm", SensorStatus.NORMAL),
        DemoSensorReading("SEN-EXPIREDPERMIT-TEMP", SensorType.TEMPERATURE, 30.0, "C", SensorStatus.NORMAL),
        DemoSensorReading("SEN-EXPIREDPERMIT-PRESSURE", SensorType.PRESSURE, 5.4, "bar", SensorStatus.NORMAL),
    ),
    workers=(
        DemoWorker(
            employee_id="EMP-1107",
            worker_id="WRK-1107",
            name="Neha Iyer",
            department="Maintenance",
            role="Maintenance Engineer",
            shift="Afternoon",
            status=WorkerStatus.WORKING,
        ),
    ),
    permits=(
        DemoPermit(
            permit_id="PTW-DEMO-EXPIREDPERMIT",
            permit_type=PermitType.HOT_WORK,
            issued_by="Safety Officer Nair",
            assigned_team="Electrical Team Sigma",
            status=PermitStatus.ACTIVE,
            start_offset_hours=-10.0,
            end_offset_hours=-2.0,
        ),
    ),
)

COMPOUND_RISK = DemoScenario(
    name="compound_risk",
    title="Compound Risk",
    narrative=(
        "Boiler-Area (a configured restricted zone): a critical temperature "
        "reading, an expired permit, a worker still present, and a boiler "
        "feedwater pump under ongoing corrective repair all stack together. "
        "Triggers several Compound Risk Engine rules simultaneously — "
        "including the equipment-health rules — demonstrating why compound "
        "detection matters beyond any single-factor score."
    ),
    zone="Boiler-Area",
    sensors=(
        DemoSensorReading("SEN-COMPOUNDRISK-TEMP", SensorType.TEMPERATURE, 45.0, "C", SensorStatus.CRITICAL),
        DemoSensorReading("SEN-COMPOUNDRISK-PRESSURE", SensorType.PRESSURE, 9.0, "bar", SensorStatus.CRITICAL),
        DemoSensorReading("SEN-COMPOUNDRISK-GAS", SensorType.GAS, 65.0, "ppm", SensorStatus.WARNING),
    ),
    workers=(
        DemoWorker(
            employee_id="EMP-1128",
            worker_id="WRK-1128",
            name="Kabir Gupta",
            department="Safety",
            role="Safety Officer",
            shift="Night",
            status=WorkerStatus.EMERGENCY,
        ),
    ),
    permits=(
        DemoPermit(
            permit_id="PTW-DEMO-COMPOUNDRISK",
            permit_type=PermitType.CONFINED_SPACE,
            issued_by="Safety Officer Patel",
            assigned_team="Utilities Team Echo",
            status=PermitStatus.ACTIVE,
            start_offset_hours=-12.0,
            end_offset_hours=-4.0,
        ),
    ),
    maintenance_logs=(
        DemoMaintenanceLog(
            log_id="MNT-DEMO-COMPOUNDRISK-1",
            equipment_id="EQ-BA-001",
            equipment_name="Boiler Feedwater Pump",
            maintenance_type=MaintenanceType.CORRECTIVE,
            assigned_team="Utilities Team Echo",
            status=MaintenanceStatus.ONGOING,
            start_offset_hours=6.0,
        ),
        DemoMaintenanceLog(
            log_id="MNT-DEMO-COMPOUNDRISK-2",
            equipment_id="EQ-BA-001",
            equipment_name="Boiler Feedwater Pump",
            maintenance_type=MaintenanceType.PREVENTIVE,
            assigned_team="Utilities Team Echo",
            status=MaintenanceStatus.COMPLETED,
            start_offset_hours=200.0,
        ),
    ),
    equipment_zone_map={"EQ-BA-001": "Boiler-Area"},
)

FIRE = DemoScenario(
    name="fire",
    title="Fire",
    narrative=(
        "Loading-Bay: critical temperature alongside elevated smoke, consistent "
        "with an active fire near a process unit. The assigned worker is in "
        "emergency status and a matching Incident record is included, "
        "exercising the fire-safety and major-hazard compliance rules end "
        "to end."
    ),
    zone="Loading-Bay",
    sensors=(
        DemoSensorReading("SEN-FIRE-TEMP", SensorType.TEMPERATURE, 62.0, "C", SensorStatus.CRITICAL),
        DemoSensorReading("SEN-FIRE-SMOKE", SensorType.SMOKE, 9.5, "ppm", SensorStatus.CRITICAL),
        DemoSensorReading("SEN-FIRE-GAS", SensorType.GAS, 48.0, "ppm", SensorStatus.NORMAL),
    ),
    workers=(
        DemoWorker(
            employee_id="EMP-1142",
            worker_id="WRK-1142",
            name="Rahul Mehta",
            department="Maintenance",
            role="Maintenance Engineer",
            shift="Afternoon",
            status=WorkerStatus.EMERGENCY,
        ),
    ),
    permits=(
        DemoPermit(
            permit_id="PTW-DEMO-FIRE",
            permit_type=PermitType.HOT_WORK,
            issued_by="Safety Officer Sharma",
            assigned_team="Mechanical Team Bravo",
            status=PermitStatus.ACTIVE,
            start_offset_hours=-3.0,
            end_offset_hours=5.0,
        ),
    ),
    incidents=(
        DemoIncident(
            incident_id="INC-DEMO-FIRE",
            severity=SeverityLevel.CRITICAL,
            incident_type=IncidentType.FIRE,
            description=(
                "Flames observed near a welding station in Loading-Bay during "
                "active hot work; smoke and temperature sensors both "
                "crossed critical thresholds within the same reporting cycle."
            ),
            root_cause=(
                "Spark from grinding operation ignited residual "
                "solvent-soaked rags left near the work area; housekeeping "
                "checklist was not completed before work began."
            ),
        ),
    ),
)

PERMIT_VIOLATION = DemoScenario(
    name="permit_violation",
    title="Permit Violation",
    narrative=(
        "Cooling-Tower: a worker continues hot work after the covering permit was "
        "actively suspended by a safety officer (not merely expired). "
        "Nominal sensors isolate the violation to permit/process discipline "
        "rather than an environmental hazard."
    ),
    zone="Cooling-Tower",
    sensors=(
        DemoSensorReading("SEN-PERMITVIOLATION-GAS", SensorType.GAS, 37.0, "ppm", SensorStatus.NORMAL),
        DemoSensorReading("SEN-PERMITVIOLATION-TEMP", SensorType.TEMPERATURE, 29.0, "C", SensorStatus.NORMAL),
        DemoSensorReading("SEN-PERMITVIOLATION-PRESSURE", SensorType.PRESSURE, 5.6, "bar", SensorStatus.NORMAL),
    ),
    workers=(
        DemoWorker(
            employee_id="EMP-1156",
            worker_id="WRK-1156",
            name="Tarun Reddy",
            department="Operations",
            role="Process Technician",
            shift="Morning",
            status=WorkerStatus.WORKING,
            ppe_status=False,
        ),
    ),
    permits=(
        DemoPermit(
            permit_id="PTW-DEMO-PERMITVIOLATION",
            permit_type=PermitType.HOT_WORK,
            issued_by="Safety Officer Nair",
            assigned_team="Electrical Team Sigma",
            status=PermitStatus.SUSPENDED,
            start_offset_hours=-4.0,
            end_offset_hours=2.0,
        ),
    ),
    incidents=(
        DemoIncident(
            incident_id="INC-DEMO-PERMITVIOLATION",
            severity=SeverityLevel.MEDIUM,
            incident_type=IncidentType.PPE_VIOLATION,
            description=(
                "Process technician continued hot work in Cooling-Tower after the "
                "covering permit was suspended by the safety officer; "
                "worker also found without required respiratory protection."
            ),
            root_cause=(
                "Stop-work notification was not relayed to the on-site "
                "technician before the next task segment began."
            ),
            minutes_before_anchor=20.0,
        ),
    ),
)

WORKER_COLLAPSE = DemoScenario(
    name="worker_collapse",
    title="Worker Collapse",
    narrative=(
        "Boiler-Unit-B-03: sensors read nominal and the permit is valid — this "
        "isolates a pure worker-safety medical emergency from any "
        "environmental or compliance driver. The assigned worker is down "
        "and unresponsive."
    ),
    zone="Boiler-Unit-B-03",
    sensors=(
        DemoSensorReading("SEN-WORKERCOLLAPSE-GAS", SensorType.GAS, 33.0, "ppm", SensorStatus.NORMAL),
        DemoSensorReading("SEN-WORKERCOLLAPSE-TEMP", SensorType.TEMPERATURE, 27.5, "C", SensorStatus.NORMAL),
        DemoSensorReading("SEN-WORKERCOLLAPSE-HUMIDITY", SensorType.HUMIDITY, 50.0, "%", SensorStatus.NORMAL),
    ),
    workers=(
        DemoWorker(
            employee_id="EMP-1160",
            worker_id="WRK-1160",
            name="Isha Verma",
            department="Operations",
            role="Field Operator",
            shift="Night",
            status=WorkerStatus.EMERGENCY,
        ),
    ),
    permits=(
        DemoPermit(
            permit_id="PTW-DEMO-WORKERCOLLAPSE",
            permit_type=PermitType.ELECTRICAL_ISOLATION,
            issued_by="Safety Officer Reddy",
            assigned_team="Electrical Team Sigma",
            status=PermitStatus.ACTIVE,
            start_offset_hours=-1.5,
            end_offset_hours=6.5,
        ),
    ),
    incidents=(
        DemoIncident(
            incident_id="INC-DEMO-WORKERCOLLAPSE",
            severity=SeverityLevel.CRITICAL,
            incident_type=IncidentType.WORKER_COLLAPSE,
            description=(
                "Field operator found collapsed and unresponsive near the "
                "electrical panel in Boiler-Unit-B-03 during a routine round; no "
                "environmental hazard indicated by surrounding sensors."
            ),
            root_cause=(
                "Suspected heat exhaustion following an extended shift "
                "without a scheduled rest break; medical response "
                "dispatched immediately."
            ),
        ),
    ),
)

CONFINED_SPACE = DemoScenario(
    name="confined_space",
    title="Confined Space Incident",
    narrative=(
        "Confined-Space-CS-07 (a configured restricted zone): a worker is "
        "present with a critical gas reading and no valid confined-space "
        "entry permit (the existing permit expired before the worker "
        "entered) — a realistic unauthorized confined-space entry during a "
        "gas excursion."
    ),
    zone="Confined-Space-CS-07",
    sensors=(
        DemoSensorReading("SEN-CONFINEDSPACE-GAS", SensorType.GAS, 88.0, "ppm", SensorStatus.CRITICAL),
        DemoSensorReading("SEN-CONFINEDSPACE-HUMIDITY", SensorType.HUMIDITY, 74.0, "%", SensorStatus.CRITICAL),
        DemoSensorReading("SEN-CONFINEDSPACE-TEMP", SensorType.TEMPERATURE, 32.0, "C", SensorStatus.NORMAL),
    ),
    workers=(
        DemoWorker(
            employee_id="EMP-1172",
            worker_id="WRK-1172",
            name="Dev Nair",
            department="Process",
            role="Shift Supervisor",
            shift="Afternoon",
            status=WorkerStatus.EMERGENCY,
        ),
    ),
    permits=(
        DemoPermit(
            permit_id="PTW-DEMO-CONFINEDSPACE",
            permit_type=PermitType.CONFINED_SPACE,
            issued_by="Safety Officer Sharma",
            assigned_team="Process Team Delta",
            status=PermitStatus.ACTIVE,
            start_offset_hours=-14.0,
            end_offset_hours=-6.0,
        ),
    ),
    incidents=(
        DemoIncident(
            incident_id="INC-DEMO-CONFINEDSPACE",
            severity=SeverityLevel.CRITICAL,
            incident_type=IncidentType.GAS_LEAK,
            description=(
                "Shift supervisor entered Confined-Space-CS-07 after the "
                "covering entry permit had already expired; gas and "
                "humidity readings both reached critical levels shortly "
                "after entry."
            ),
            root_cause=(
                "Permit expiry was not re-verified against the entry log "
                "before the supervisor proceeded into the vessel."
            ),
            minutes_before_anchor=5.0,
        ),
    ),
)

ALL_SCENARIOS: tuple[DemoScenario, ...] = (
    NORMAL,
    GAS_LEAK,
    EXPIRED_PERMIT,
    COMPOUND_RISK,
    FIRE,
    PERMIT_VIOLATION,
    WORKER_COLLAPSE,
    CONFINED_SPACE,
)

SCENARIOS_BY_NAME: dict[str, DemoScenario] = {scenario.name: scenario for scenario in ALL_SCENARIOS}
