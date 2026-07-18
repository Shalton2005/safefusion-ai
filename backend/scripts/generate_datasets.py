"""Synthetic dataset generator CLI for SafeFusion AI.

Generates realistic, cross-referenced synthetic datasets for Zones,
Workers, Equipment, Permits, Maintenance Records, Shift Schedules, and
Sensor Readings, and exports each as CSV and/or JSON. Pure standalone data
generation — no database connection required, unlike
``scripts/seed_demo_data.py`` which seeds PostgreSQL/Neo4j directly.

Usage:
    cd backend
    python scripts/generate_datasets.py

Deterministic demo mode (reproducible output across runs):
    python scripts/generate_datasets.py --seed 42

Custom volumes and output directory:
    python scripts/generate_datasets.py \
        --workers 100 --equipment 50 --permits 80 --maintenance 120 \
        --sensor-ticks 12 --format csv json --out-dir ../datasets/generated
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone

# Ensure `src.*` imports resolve when run as a script from backend/scripts.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.services.dataset_generation import (
    DatasetGenerationConfig,
    DatasetGenerationService,
    write_csv,
    write_json,
)

DEFAULT_OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "datasets", "generated")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic SafeFusion AI datasets")
    parser.add_argument("--workers", type=int, default=50, help="Number of workers to generate")
    parser.add_argument("--equipment", type=int, default=30, help="Number of equipment records to generate")
    parser.add_argument("--permits", type=int, default=40, help="Number of permits to generate")
    parser.add_argument("--maintenance", type=int, default=60, help="Number of maintenance records to generate")
    parser.add_argument("--shift-days", type=int, default=7, help="Number of days the shift schedule covers")
    parser.add_argument("--sensor-ticks", type=int, default=1, help="Number of simulated sensor reading batches")
    parser.add_argument(
        "--deterministic-sensors",
        action="store_true",
        help="Use the sensor simulator's deterministic waveform mode instead of seeded random mode",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Fix the RNG seed for reproducible ('deterministic demo mode') output across runs",
    )
    parser.add_argument(
        "--anchor-time",
        type=str,
        default=None,
        help=(
            "ISO 8601 timestamp all relative dates/times are computed from (e.g. "
            "2026-01-01T00:00:00+00:00). Required alongside --seed for byte-identical "
            "output across separate runs — without it, time-relative fields like "
            "hire_date still vary run to run even with the same seed."
        ),
    )
    parser.add_argument(
        "--format",
        nargs="+",
        choices=["csv", "json"],
        default=["csv", "json"],
        help="Export format(s) to write (default: both)",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default=DEFAULT_OUT_DIR,
        help="Output directory for generated files (default: datasets/generated at repo root)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    anchor_time = datetime.fromisoformat(args.anchor_time) if args.anchor_time else None
    if anchor_time is not None and anchor_time.tzinfo is None:
        anchor_time = anchor_time.replace(tzinfo=timezone.utc)

    config = DatasetGenerationConfig(
        worker_count=args.workers,
        equipment_count=args.equipment,
        permit_count=args.permits,
        maintenance_count=args.maintenance,
        shift_schedule_days=args.shift_days,
        sensor_ticks=args.sensor_ticks,
        deterministic_sensors=args.deterministic_sensors,
        seed=args.seed,
        anchor_time=anchor_time,
    )

    dataset = DatasetGenerationService().generate(config)

    print(f"Dataset generation completed (seed={args.seed!r}).")
    for name, records in dataset.as_named_collections().items():
        print(f"  {name}: {len(records)} records")

        if "csv" in args.format:
            path = write_csv(records, os.path.join(args.out_dir, f"{name}.csv"))
            print(f"    -> {path}")
        if "json" in args.format:
            path = write_json(records, os.path.join(args.out_dir, f"{name}.json"))
            print(f"    -> {path}")


if __name__ == "__main__":
    main()
