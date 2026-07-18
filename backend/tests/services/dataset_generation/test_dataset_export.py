"""Tests for the CSV/JSON dataset exporters."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from pathlib import Path

from src.services.dataset_generation.entities import Zone
from src.services.dataset_generation.export import to_csv, to_json, write_csv, write_json

_SAMPLE_ZONES = [
    Zone(zone_id="Zone-A", name="Process Unit A", building="Building 3", hazard_category="toxic_gas", is_restricted=False),
    Zone(zone_id="Zone-B", name="Process Unit B", building="Building 3", hazard_category="electrical", is_restricted=True),
]


class TestToJson:
    def test_produces_valid_json_array_matching_records(self) -> None:
        payload = json.loads(to_json(_SAMPLE_ZONES))
        assert len(payload) == 2
        assert payload[0]["zone_id"] == "Zone-A"
        assert payload[1]["is_restricted"] is True

    def test_empty_records_produce_empty_array(self) -> None:
        assert json.loads(to_json([])) == []


class TestToCsv:
    def test_produces_header_and_rows(self) -> None:
        csv_text = to_csv(_SAMPLE_ZONES)
        rows = list(csv.DictReader(io.StringIO(csv_text)))
        assert len(rows) == 2
        assert rows[0]["zone_id"] == "Zone-A"
        assert rows[1]["hazard_category"] == "electrical"

    def test_empty_records_produce_empty_string(self) -> None:
        assert to_csv([]) == ""


class TestFileWriters:
    def test_write_json_creates_parent_dirs_and_readable_file(self, tmp_path: Path) -> None:
        target = tmp_path / "nested" / "zones.json"
        written = write_json(_SAMPLE_ZONES, target)
        assert written == target
        assert json.loads(target.read_text(encoding="utf-8"))[0]["zone_id"] == "Zone-A"

    def test_write_csv_creates_parent_dirs_and_readable_file(self, tmp_path: Path) -> None:
        target = tmp_path / "nested" / "zones.csv"
        written = write_csv(_SAMPLE_ZONES, target)
        assert written == target
        rows = list(csv.DictReader(io.StringIO(target.read_text(encoding="utf-8"))))
        assert rows[0]["zone_id"] == "Zone-A"


class TestEntityAsDict:
    def test_enum_and_datetime_fields_serialize_to_primitives(self) -> None:
        from dataclasses import dataclass
        from enum import Enum

        from src.services.dataset_generation.entities import DatasetEntity

        class Status(str, Enum):
            ACTIVE = "active"

        @dataclass(frozen=True)
        class _Sample(DatasetEntity):
            status: Status
            when: datetime

        sample = _Sample(status=Status.ACTIVE, when=datetime(2026, 1, 1, tzinfo=timezone.utc))
        result = sample.as_dict()
        assert result["status"] == "active"
        assert result["when"] == "2026-01-01T00:00:00+00:00"
