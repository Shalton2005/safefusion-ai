"""Reusable industrial demo data seeder for SafeFusion AI.

Seeds deterministic, relationship-aware records for:
- Workers
- Sensors
- Permits
- Maintenance Logs
- Alerts
- Incidents

Also seeds a single, coherent Day 7 dashboard demo scenario in Zone-A:
- One critical gas sensor
- One elevated (warning) temperature reading
- One normal pressure reading
- One expired permit
- One worker inside the affected zone

Design goals:
- Uses SQLAlchemy ORM models and the project's configured session factory.
- Avoids hardcoded credentials by relying on application settings.
- Stays idempotent where possible using stable natural seed signatures.
- Generates realistic timestamps, zones, teams, equipment, and event narratives.

Usage:
    cd backend
    python scripts/seed_demo_data.py

Optional overrides:
    python scripts/seed_demo_data.py \
        --workers 20 \
        --sensors 35 \
        --permits 15 \
        --alerts 20 \
        --incidents 15 \
        --maintenance-logs 10 \
        --no-demo-scenario
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

# Ensure `src.*` imports resolve when run as a script from backend/scripts.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.database.session import SessionLocal
from src.models.alert import Alert
from src.models.enums import (
    AlertStatus,
    AlertType,
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
from src.models.incident import Incident
from src.models.maintenance import MaintenanceLog
from src.models.permit import Permit
from src.models.sensor import Sensor
from src.models.worker import Worker


BASE_TIME = datetime(2026, 7, 8, 6, 0, tzinfo=UTC)
ZONES = ["Tank-Farm", "Boiler-Area", "Zone-A", "Zone-B", "Zone-C", "Zone-D"]
SHIFTS = ["Morning", "Afternoon", "Night"]
FIRST_NAMES = [
    "Aarav",
    "Vikram",
    "Kiran",
    "Sana",
    "Neha",
    "Rohan",
    "Isha",
    "Deepak",
    "Priya",
    "Ananya",
    "Rahul",
    "Meera",
    "Kabir",
    "Nisha",
    "Arjun",
    "Tarun",
    "Leena",
    "Dev",
    "Pooja",
    "Harsh",
]
LAST_NAMES = [
    "Sharma",
    "Verma",
    "Patel",
    "Nair",
    "Iyer",
    "Singh",
    "Mehta",
    "Reddy",
    "Das",
    "Gupta",
]
WORKER_PROFILES = [
    ("Operations", "Process Technician"),
    ("Operations", "Field Operator"),
    ("Safety", "Safety Officer"),
    ("Maintenance", "Maintenance Engineer"),
    ("Utilities", "Control Room Operator"),
    ("Process", "Shift Supervisor"),
]
ZONE_SENSOR_BLUEPRINTS: dict[str, list[tuple[SensorType, float, str, SensorStatus]]] = {
    "Tank-Farm": [
        (SensorType.GAS, 84.0, "ppm", SensorStatus.CRITICAL),
        (SensorType.TEMPERATURE, 39.0, "C", SensorStatus.WARNING),
        (SensorType.PRESSURE, 6.2, "bar", SensorStatus.WARNING),
        (SensorType.HUMIDITY, 55.0, "%", SensorStatus.NORMAL),
    ],
    "Boiler-Area": [
        (SensorType.TEMPERATURE, 44.5, "C", SensorStatus.CRITICAL),
        (SensorType.PRESSURE, 8.9, "bar", SensorStatus.CRITICAL),
        (SensorType.GAS, 52.0, "ppm", SensorStatus.NORMAL),
        (SensorType.HUMIDITY, 49.0, "%", SensorStatus.NORMAL),
    ],
    "Zone-A": [
        (SensorType.GAS, 58.0, "ppm", SensorStatus.WARNING),
        (SensorType.TEMPERATURE, 34.0, "C", SensorStatus.NORMAL),
        (SensorType.PRESSURE, 5.8, "bar", SensorStatus.NORMAL),
        (SensorType.HUMIDITY, 63.0, "%", SensorStatus.WARNING),
    ],
    "Zone-B": [
        (SensorType.GAS, 42.0, "ppm", SensorStatus.NORMAL),
        (SensorType.TEMPERATURE, 31.5, "C", SensorStatus.NORMAL),
        (SensorType.PRESSURE, 7.4, "bar", SensorStatus.WARNING),
        (SensorType.HUMIDITY, 59.0, "%", SensorStatus.NORMAL),
    ],
    "Zone-C": [
        (SensorType.GAS, 76.0, "ppm", SensorStatus.WARNING),
        (SensorType.TEMPERATURE, 37.5, "C", SensorStatus.WARNING),
        (SensorType.PRESSURE, 6.6, "bar", SensorStatus.NORMAL),
        (SensorType.HUMIDITY, 68.0, "%", SensorStatus.WARNING),
    ],
    "Zone-D": [
        (SensorType.GAS, 35.0, "ppm", SensorStatus.NORMAL),
        (SensorType.TEMPERATURE, 29.5, "C", SensorStatus.NORMAL),
        (SensorType.PRESSURE, 5.2, "bar", SensorStatus.NORMAL),
        (SensorType.HUMIDITY, 52.0, "%", SensorStatus.NORMAL),
    ],
}
EQUIPMENT_CATALOG = [
    {"equipment_id": "EQ-TF-001", "equipment_name": "Tank Farm Vapor Recovery Unit", "zone": "Tank-Farm", "team": "Mechanical Team Bravo"},
    {"equipment_id": "EQ-TF-002", "equipment_name": "Tank 12 Transfer Pump", "zone": "Tank-Farm", "team": "Operations Team Alpha"},
    {"equipment_id": "EQ-BA-001", "equipment_name": "Boiler Feedwater Pump", "zone": "Boiler-Area", "team": "Utilities Team Echo"},
    {"equipment_id": "EQ-BA-002", "equipment_name": "Boiler Drum Safety Valve", "zone": "Boiler-Area", "team": "Mechanical Team Bravo"},
    {"equipment_id": "EQ-ZA-001", "equipment_name": "Compressor Unit 3", "zone": "Zone-A", "team": "Mechanical Team Bravo"},
    {"equipment_id": "EQ-ZA-002", "equipment_name": "Gas Scrubber Skid", "zone": "Zone-A", "team": "Process Team Delta"},
    {"equipment_id": "EQ-ZB-001", "equipment_name": "Electrical MCC Panel B", "zone": "Zone-B", "team": "Electrical Team Sigma"},
    {"equipment_id": "EQ-ZB-002", "equipment_name": "Nitrogen Manifold", "zone": "Zone-B", "team": "Utilities Team Echo"},
    {"equipment_id": "EQ-ZC-001", "equipment_name": "Solvent Mixing Vessel", "zone": "Zone-C", "team": "Process Team Delta"},
    {"equipment_id": "EQ-ZC-002", "equipment_name": "Exhaust Ventilation Fan 2", "zone": "Zone-C", "team": "Mechanical Team Bravo"},
    {"equipment_id": "EQ-ZD-001", "equipment_name": "Cooling Water Pump 4", "zone": "Zone-D", "team": "Utilities Team Echo"},
    {"equipment_id": "EQ-ZD-002", "equipment_name": "Firewater Isolation Valve", "zone": "Zone-D", "team": "Safety Response Team"},
]
PERMIT_ASSIGNMENTS = [
    (PermitType.HOT_WORK, "Tank-Farm", "Safety Officer Patel", "Mechanical Team Bravo"),
    (PermitType.CONFINED_SPACE, "Zone-C", "Safety Officer Sharma", "Process Team Delta"),
    (PermitType.ELECTRICAL, "Zone-B", "Safety Officer Nair", "Electrical Team Sigma"),
    (PermitType.HOT_WORK, "Boiler-Area", "Safety Officer Patel", "Utilities Team Echo"),
    (PermitType.CONFINED_SPACE, "Zone-A", "Safety Officer Sharma", "Mechanical Team Bravo"),
]


DEMO_SCENARIO_ZONE = "Zone-A"
DEMO_SCENARIO_EMPLOYEE_ID = "EMP-DEMO-001"


@dataclass
class SeedReport:
    workers_created: int = 0
    sensors_created: int = 0
    permits_created: int = 0
    maintenance_logs_created: int = 0
    alerts_created: int = 0
    incidents_created: int = 0
    demo_scenario_created: int = 0


def seed_workers(db: Session, target_count: int) -> int:
    created = 0

    for i in range(target_count):
        employee_id = f"EMP-{i + 1:04d}"
        exists = db.execute(
            select(Worker.id).where(Worker.employee_id == employee_id).limit(1)
        ).scalar_one_or_none()
        if exists is not None:
            continue

        department, role = WORKER_PROFILES[i % len(WORKER_PROFILES)]
        zone = ZONES[i % len(ZONES)]
        db.add(
            Worker(
                name=f"{FIRST_NAMES[i % len(FIRST_NAMES)]} {LAST_NAMES[i % len(LAST_NAMES)]}",
                employee_id=employee_id,
                department=department,
                role=role,
                current_zone=zone,
                ppe_status=(i % 6 != 0),
                shift=SHIFTS[i % len(SHIFTS)],
                status=(
                    WorkerStatus.EMERGENCY
                    if zone in {"Tank-Farm", "Boiler-Area"} and i in {0, 9}
                    else WorkerStatus.IDLE if i % 7 == 0 else WorkerStatus.WORKING
                ),
            )
        )
        created += 1

    return created


def _sensor_payload(i: int) -> tuple[str, SensorType, float, str, SensorStatus, datetime]:
    zone = ZONES[i % len(ZONES)]
    blueprint = ZONE_SENSOR_BLUEPRINTS[zone]
    sensor_type, base_value, unit, base_status = blueprint[(i // len(ZONES)) % len(blueprint)]
    fluctuation = ((i % 5) - 2) * 1.1
    value = round(base_value + fluctuation, 2)

    if sensor_type == SensorType.GAS:
        status = SensorStatus.CRITICAL if value >= 80 else SensorStatus.WARNING if value >= 60 else SensorStatus.NORMAL
    elif sensor_type == SensorType.TEMPERATURE:
        status = SensorStatus.CRITICAL if value >= 42 else SensorStatus.WARNING if value >= 36 else SensorStatus.NORMAL
    elif sensor_type == SensorType.PRESSURE:
        status = SensorStatus.CRITICAL if value >= 8.5 else SensorStatus.WARNING if value >= 7.0 else SensorStatus.NORMAL
    else:
        status = SensorStatus.CRITICAL if value >= 72 else SensorStatus.WARNING if value >= 62 else SensorStatus.NORMAL

    if base_status == SensorStatus.CRITICAL and status == SensorStatus.WARNING:
        status = SensorStatus.CRITICAL

    timestamp = BASE_TIME + timedelta(minutes=12 * i)
    return zone, sensor_type, value, unit, status, timestamp


def seed_sensors(db: Session, target_count: int) -> int:
    created = 0

    for i in range(target_count):
        zone, sensor_type, value, unit, status, timestamp = _sensor_payload(i)

        exists = db.execute(
            select(Sensor.id)
            .where(
                Sensor.zone == zone,
                Sensor.sensor_type == sensor_type,
                Sensor.timestamp == timestamp,
            )
            .limit(1)
        ).scalar_one_or_none()

        if exists is not None:
            continue

        db.add(
            Sensor(
                zone=zone,
                sensor_type=sensor_type,
                value=value,
                unit=unit,
                status=status,
                timestamp=timestamp,
            )
        )
        created += 1

    return created


def seed_permits(db: Session, target_count: int) -> int:
    created = 0

    for i in range(target_count):
        permit_type, zone, issued_by, assigned_team = PERMIT_ASSIGNMENTS[i % len(PERMIT_ASSIGNMENTS)]
        start_time = BASE_TIME - timedelta(hours=18) + timedelta(hours=3 * i)
        end_time = start_time + timedelta(hours=8 if permit_type == PermitType.CONFINED_SPACE else 6)
        permit_status = (
            PermitStatus.SUSPENDED if zone == "Tank-Farm" and i % 5 == 0
            else PermitStatus.CLOSED if i % 4 == 0
            else PermitStatus.ACTIVE
        )

        exists = db.execute(
            select(Permit.id)
            .where(
                Permit.permit_type == permit_type,
                Permit.zone == zone,
                Permit.start_time == start_time,
            )
            .limit(1)
        ).scalar_one_or_none()
        if exists is not None:
            continue

        db.add(
            Permit(
                permit_type=permit_type,
                zone=zone,
                issued_by=issued_by,
                assigned_team=assigned_team,
                start_time=start_time,
                end_time=end_time,
                status=permit_status,
            )
        )
        created += 1

    return created


def seed_maintenance_logs(db: Session, target_count: int) -> int:
    created = 0

    for i in range(target_count):
        equipment = EQUIPMENT_CATALOG[i % len(EQUIPMENT_CATALOG)]
        start_time = BASE_TIME - timedelta(hours=36) + timedelta(hours=5 * i)
        maintenance_type = (
            MaintenanceType.CORRECTIVE
            if equipment["zone"] in {"Tank-Farm", "Boiler-Area", "Zone-C"} and i % 3 == 0
            else MaintenanceType.PREVENTIVE
        )
        maintenance_status = (
            MaintenanceStatus.ONGOING if i % 4 == 0
            else MaintenanceStatus.COMPLETED if i % 3 == 0
            else MaintenanceStatus.PLANNED
        )
        end_time = None if maintenance_status == MaintenanceStatus.ONGOING else start_time + timedelta(hours=4)

        exists = db.execute(
            select(MaintenanceLog.id)
            .where(
                MaintenanceLog.equipment_id == equipment["equipment_id"],
                MaintenanceLog.maintenance_type == maintenance_type,
                MaintenanceLog.start_time == start_time,
            )
            .limit(1)
        ).scalar_one_or_none()
        if exists is not None:
            continue

        db.add(
            MaintenanceLog(
                equipment_id=equipment["equipment_id"],
                equipment_name=equipment["equipment_name"],
                maintenance_type=maintenance_type,
                assigned_team=equipment["team"],
                status=maintenance_status,
                start_time=start_time,
                end_time=end_time,
            )
        )
        created += 1

    return created


def seed_incidents(db: Session, target_count: int) -> int:
    created = 0
    scenarios = [
        (
            "Tank-Farm",
            SeverityLevel.CRITICAL,
            IncidentType.GAS_LEAK,
            "Elevated hydrocarbon vapors detected near transfer pump.",
            "Corroded flange gasket on transfer line.",
        ),
        (
            "Boiler-Area",
            SeverityLevel.HIGH,
            IncidentType.FIRE,
            "Localized flame detected near burner access platform.",
            "Fuel nozzle fouling caused unstable ignition.",
        ),
        (
            "Zone-C",
            SeverityLevel.HIGH,
            IncidentType.PPE_VIOLATION,
            "Contractor entered confined area without full respiratory protection.",
            "Entry checklist was bypassed during shift handover.",
        ),
        (
            "Zone-B",
            SeverityLevel.MEDIUM,
            IncidentType.EXPLOSION,
            "Pressure surge triggered emergency shutdown of electrical panel room.",
            "Arc flash risk increased after moisture intrusion.",
        ),
        (
            "Zone-A",
            SeverityLevel.MEDIUM,
            IncidentType.GAS_LEAK,
            "Solvent vapors rose above warning threshold near scrubber skid.",
            "Temporary seal degradation during hot work preparation.",
        ),
    ]

    for i in range(target_count):
        zone, severity, incident_type, description, root_cause = scenarios[i % len(scenarios)]
        occurred_at = BASE_TIME - timedelta(hours=72) + timedelta(hours=6 * i)

        exists = db.execute(
            select(Incident.id)
            .where(
                Incident.zone == zone,
                Incident.incident_type == incident_type,
                Incident.occurred_at == occurred_at,
            )
            .limit(1)
        ).scalar_one_or_none()
        if exists is not None:
            continue

        db.add(
            Incident(
                zone=zone,
                severity=severity,
                incident_type=incident_type,
                description=description,
                root_cause=root_cause,
                occurred_at=occurred_at,
            )
        )
        created += 1

    return created


def seed_alerts(db: Session, target_count: int) -> int:
    created = 0
    alert_messages = {
        "Tank-Farm": (
            AlertType.CRITICAL,
            "Critical gas concentration near Tank 12; suspend hot work and isolate transfer operations.",
        ),
        "Boiler-Area": (
            AlertType.CRITICAL,
            "Boiler pressure and temperature exceed safe threshold; dispatch utilities team immediately.",
        ),
        "Zone-C": (
            AlertType.WARNING,
            "Confined space activity and rising solvent vapors require supervisory verification.",
        ),
        "Zone-B": (
            AlertType.WARNING,
            "Electrical panel room shows unstable pressure trend; inspect ventilation and moisture ingress.",
        ),
        "Zone-A": (
            AlertType.WARNING,
            "Gas readings trending upward near scrubber skid; verify permit controls before work starts.",
        ),
        "Zone-D": (
            AlertType.WARNING,
            "Routine anomaly detected in cooling water circuit; continue observation and schedule inspection.",
        ),
    }

    for i in range(target_count):
        zone = ZONES[i % len(ZONES)]
        alert_type, message = alert_messages[zone]
        generated_at = BASE_TIME - timedelta(hours=14) + timedelta(minutes=30 * i)
        alert_status = (
            AlertStatus.RESOLVED if i % 6 == 0
            else AlertStatus.ACKNOWLEDGED if i % 4 == 0
            else AlertStatus.ACTIVE
        )

        exists = db.execute(
            select(Alert.id)
            .where(
                Alert.zone == zone,
                Alert.alert_type == alert_type,
                Alert.generated_at == generated_at,
            )
            .limit(1)
        ).scalar_one_or_none()
        if exists is not None:
            continue

        db.add(
            Alert(
                zone=zone,
                alert_type=alert_type,
                message=message,
                generated_by="AI Engine",
                status=alert_status,
                generated_at=generated_at,
            )
        )
        created += 1

    return created


def seed_demo_scenario(db: Session) -> int:
    """Seed a single deterministic, coherent Day 7 dashboard demo scenario.

    Ties one critical gas sensor, one elevated temperature reading, one
    normal pressure reading, one expired permit, and one worker together
    in the same zone so the dashboard tells one coherent story instead of
    scattering independent random signals across zones.

    Uses fixed natural keys (employee ID, zone + sensor type + timestamp,
    permit start_time) so re-running the seeder does not duplicate rows.
    Permit expiry is anchored to wall-clock "now" (not ``BASE_TIME``)
    because permit validation classifies expiry relative to real time.
    """
    created = 0
    now = datetime.now(UTC)
    scenario_timestamp = now - timedelta(minutes=5)

    # ── Critical gas sensor ──────────────────────────────────────────────────
    gas_exists = db.execute(
        select(Sensor.id)
        .where(
            Sensor.zone == DEMO_SCENARIO_ZONE,
            Sensor.sensor_type == SensorType.GAS,
            Sensor.timestamp == scenario_timestamp,
        )
        .limit(1)
    ).scalar_one_or_none()
    if gas_exists is None:
        db.add(
            Sensor(
                zone=DEMO_SCENARIO_ZONE,
                sensor_type=SensorType.GAS,
                value=92.5,
                unit="ppm",
                status=SensorStatus.CRITICAL,
                timestamp=scenario_timestamp,
            )
        )
        created += 1

    # ── Elevated (warning) temperature ───────────────────────────────────────
    temperature_exists = db.execute(
        select(Sensor.id)
        .where(
            Sensor.zone == DEMO_SCENARIO_ZONE,
            Sensor.sensor_type == SensorType.TEMPERATURE,
            Sensor.timestamp == scenario_timestamp,
        )
        .limit(1)
    ).scalar_one_or_none()
    if temperature_exists is None:
        db.add(
            Sensor(
                zone=DEMO_SCENARIO_ZONE,
                sensor_type=SensorType.TEMPERATURE,
                value=39.5,
                unit="C",
                status=SensorStatus.WARNING,
                timestamp=scenario_timestamp,
            )
        )
        created += 1

    # ── Normal pressure ───────────────────────────────────────────────────────
    pressure_exists = db.execute(
        select(Sensor.id)
        .where(
            Sensor.zone == DEMO_SCENARIO_ZONE,
            Sensor.sensor_type == SensorType.PRESSURE,
            Sensor.timestamp == scenario_timestamp,
        )
        .limit(1)
    ).scalar_one_or_none()
    if pressure_exists is None:
        db.add(
            Sensor(
                zone=DEMO_SCENARIO_ZONE,
                sensor_type=SensorType.PRESSURE,
                value=5.5,
                unit="bar",
                status=SensorStatus.NORMAL,
                timestamp=scenario_timestamp,
            )
        )
        created += 1

    # ── Expired permit ───────────────────────────────────────────────────────
    permit_start_time = now - timedelta(hours=10)
    permit_end_time = now - timedelta(hours=2)
    permit_exists = db.execute(
        select(Permit.id)
        .where(
            Permit.permit_type == PermitType.HOT_WORK,
            Permit.zone == DEMO_SCENARIO_ZONE,
            Permit.start_time == permit_start_time,
        )
        .limit(1)
    ).scalar_one_or_none()
    if permit_exists is None:
        db.add(
            Permit(
                permit_type=PermitType.HOT_WORK,
                zone=DEMO_SCENARIO_ZONE,
                issued_by="Safety Officer Sharma",
                assigned_team="Mechanical Team Bravo",
                start_time=permit_start_time,
                end_time=permit_end_time,
                status=PermitStatus.ACTIVE,
            )
        )
        created += 1

    # ── Worker inside the affected zone ──────────────────────────────────────
    worker_exists = db.execute(
        select(Worker.id).where(Worker.employee_id == DEMO_SCENARIO_EMPLOYEE_ID).limit(1)
    ).scalar_one_or_none()
    if worker_exists is None:
        db.add(
            Worker(
                name="Arjun Mehta",
                employee_id=DEMO_SCENARIO_EMPLOYEE_ID,
                department="Operations",
                role="Field Operator",
                current_zone=DEMO_SCENARIO_ZONE,
                ppe_status=True,
                shift="Morning",
                status=WorkerStatus.WORKING,
            )
        )
        created += 1

    return created


def run_seed(
    workers: int,
    sensors: int,
    permits: int,
    maintenance_logs: int,
    alerts: int,
    incidents: int,
    demo_scenario: bool = True,
) -> SeedReport:
    report = SeedReport()

    with SessionLocal() as db:
        report.workers_created = seed_workers(db, workers)
        report.sensors_created = seed_sensors(db, sensors)
        report.permits_created = seed_permits(db, permits)
        report.maintenance_logs_created = seed_maintenance_logs(db, maintenance_logs)
        report.incidents_created = seed_incidents(db, incidents)
        report.alerts_created = seed_alerts(db, alerts)
        if demo_scenario:
            report.demo_scenario_created = seed_demo_scenario(db)
        db.commit()

    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed SafeFusion AI demo data")
    parser.add_argument("--workers", type=int, default=20, help="Number of workers to seed")
    parser.add_argument("--sensors", type=int, default=35, help="Number of sensors to seed")
    parser.add_argument("--permits", type=int, default=15, help="Number of permits to seed")
    parser.add_argument(
        "--maintenance-logs",
        type=int,
        default=10,
        help="Number of maintenance logs to seed",
    )
    parser.add_argument("--alerts", type=int, default=20, help="Number of alerts to seed")
    parser.add_argument("--incidents", type=int, default=15, help="Number of incidents to seed")
    parser.add_argument(
        "--no-demo-scenario",
        action="store_true",
        help=(
            "Skip seeding the deterministic Day 7 demo scenario "
            f"(critical gas sensor, elevated temperature, normal pressure, "
            f"expired permit, and worker, all in {DEMO_SCENARIO_ZONE})."
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = run_seed(
        workers=args.workers,
        sensors=args.sensors,
        permits=args.permits,
        maintenance_logs=args.maintenance_logs,
        alerts=args.alerts,
        incidents=args.incidents,
        demo_scenario=not args.no_demo_scenario,
    )

    print("Demo seed completed.")
    print(f"Workers created: {report.workers_created}")
    print(f"Sensors created: {report.sensors_created}")
    print(f"Permits created: {report.permits_created}")
    print(f"Maintenance logs created: {report.maintenance_logs_created}")
    print(f"Alerts created: {report.alerts_created}")
    print(f"Incidents created: {report.incidents_created}")
    print(f"Demo scenario records created: {report.demo_scenario_created}")


if __name__ == "__main__":
    main()
