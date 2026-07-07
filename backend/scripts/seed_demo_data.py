"""
Reusable demo data seeder for SafeFusion AI.

Seeds deterministic records for:
- Workers
- Sensors
- Permits
- Alerts

Design goals:
- Uses SQLAlchemy ORM models and session factory from the app.
- Uses project configuration (no hardcoded credentials).
- Is idempotent where possible by checking natural seed signatures before insert.

Usage:
    cd backend
    python scripts/seed_demo_data.py

Optional overrides:
    python scripts/seed_demo_data.py --workers 15 --sensors 25 --permits 8 --alerts 10
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
from src.models.enums import AlertStatus, AlertType, PermitStatus, PermitType, SensorStatus, SensorType, WorkerStatus
from src.models.permit import Permit
from src.models.sensor import Sensor
from src.models.worker import Worker


BASE_TIME = datetime(2026, 1, 1, 8, 0, tzinfo=UTC)

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

DEPARTMENTS = ["Operations", "Maintenance", "Safety", "Utilities", "Process"]
ROLES = ["Process Technician", "Safety Officer", "Shift Supervisor", "Maintenance Engineer"]
SHIFTS = ["Morning", "Afternoon", "Night"]
ZONES = ["Zone-A", "Zone-B", "Zone-C", "Zone-D", "Tank-Farm", "Boiler-Area"]


@dataclass
class SeedReport:
    workers_created: int = 0
    sensors_created: int = 0
    permits_created: int = 0
    alerts_created: int = 0


def seed_workers(db: Session, target_count: int) -> int:
    created = 0

    for i in range(target_count):
        employee_id = f"EMP-{i + 1:04d}"

        exists = db.execute(
            select(Worker.id).where(Worker.employee_id == employee_id).limit(1)
        ).scalar_one_or_none()
        if exists is not None:
            continue

        first = FIRST_NAMES[i % len(FIRST_NAMES)]
        last = LAST_NAMES[i % len(LAST_NAMES)]
        worker = Worker(
            name=f"{first} {last}",
            employee_id=employee_id,
            department=DEPARTMENTS[i % len(DEPARTMENTS)],
            role=ROLES[i % len(ROLES)],
            current_zone=ZONES[i % len(ZONES)],
            ppe_status=(i % 5 != 0),
            shift=SHIFTS[i % len(SHIFTS)],
            status=WorkerStatus.WORKING if i % 7 != 0 else WorkerStatus.IDLE,
        )
        db.add(worker)
        created += 1

    return created


def _sensor_payload(i: int) -> tuple[str, SensorType, float, str, SensorStatus, datetime]:
    zone = ZONES[i % len(ZONES)]
    sensor_type = [SensorType.GAS, SensorType.TEMPERATURE, SensorType.PRESSURE, SensorType.HUMIDITY][i % 4]

    if sensor_type == SensorType.GAS:
        value = 40.0 + (i % 8) * 7.5
        unit = "ppm"
        status = SensorStatus.CRITICAL if value > 80 else SensorStatus.WARNING if value > 60 else SensorStatus.NORMAL
    elif sensor_type == SensorType.TEMPERATURE:
        value = 28.0 + (i % 10) * 2.2
        unit = "C"
        status = SensorStatus.CRITICAL if value > 42 else SensorStatus.WARNING if value > 36 else SensorStatus.NORMAL
    elif sensor_type == SensorType.PRESSURE:
        value = 4.5 + (i % 7) * 0.8
        unit = "bar"
        status = SensorStatus.CRITICAL if value > 8.5 else SensorStatus.WARNING if value > 7.0 else SensorStatus.NORMAL
    else:
        value = 35.0 + (i % 9) * 4.0
        unit = "%"
        status = SensorStatus.CRITICAL if value > 72 else SensorStatus.WARNING if value > 62 else SensorStatus.NORMAL

    timestamp = BASE_TIME + timedelta(minutes=i * 10)
    return zone, sensor_type, round(value, 2), unit, status, timestamp


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

    permit_types = [PermitType.HOT_WORK, PermitType.CONFINED_SPACE, PermitType.ELECTRICAL]
    teams = ["Maintenance Team Alpha", "Operations Team Bravo", "Safety Team Delta"]
    issuers = ["Officer Patel", "Officer Sharma", "Officer Nair"]

    for i in range(target_count):
        start_time = BASE_TIME + timedelta(hours=2 * i)
        end_time = start_time + timedelta(hours=6)
        permit_type = permit_types[i % len(permit_types)]
        zone = ZONES[i % len(ZONES)]
        assigned_team = teams[i % len(teams)]
        issued_by = issuers[i % len(issuers)]

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
                status=PermitStatus.ACTIVE if i % 4 != 0 else PermitStatus.SUSPENDED,
            )
        )
        created += 1

    return created


def seed_alerts(db: Session, target_count: int) -> int:
    created = 0

    for i in range(target_count):
        generated_at = BASE_TIME + timedelta(minutes=i * 15)
        zone = ZONES[i % len(ZONES)]
        alert_type = AlertType.CRITICAL if i % 3 == 0 else AlertType.WARNING
        message = (
            "Critical gas threshold exceeded; isolate zone and verify ventilation."
            if alert_type == AlertType.CRITICAL
            else "Rising risk trend detected; perform safety inspection."
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
                status=AlertStatus.ACTIVE if i % 5 != 0 else AlertStatus.ACKNOWLEDGED,
                generated_at=generated_at,
            )
        )
        created += 1

    return created


def run_seed(workers: int, sensors: int, permits: int, alerts: int) -> SeedReport:
    report = SeedReport()

    with SessionLocal() as db:
        report.workers_created = seed_workers(db, workers)
        report.sensors_created = seed_sensors(db, sensors)
        report.permits_created = seed_permits(db, permits)
        report.alerts_created = seed_alerts(db, alerts)
        db.commit()

    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed SafeFusion AI demo data")
    parser.add_argument("--workers", type=int, default=15, help="Number of workers to seed")
    parser.add_argument("--sensors", type=int, default=25, help="Number of sensors to seed")
    parser.add_argument("--permits", type=int, default=8, help="Number of permits to seed")
    parser.add_argument("--alerts", type=int, default=10, help="Number of alerts to seed")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = run_seed(
        workers=args.workers,
        sensors=args.sensors,
        permits=args.permits,
        alerts=args.alerts,
    )

    print("Demo seed completed.")
    print(f"Workers created: {report.workers_created}")
    print(f"Sensors created: {report.sensors_created}")
    print(f"Permits created: {report.permits_created}")
    print(f"Alerts created: {report.alerts_created}")


if __name__ == "__main__":
    main()
