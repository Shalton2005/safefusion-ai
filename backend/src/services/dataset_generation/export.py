"""CSV/JSON exporters for generated datasets.

Entity-agnostic: every export function operates on ``DatasetEntity``
instances via their ``as_dict()`` method, so adding a new entity type to
the generator package never requires touching this module.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path
from typing import Sequence

from src.services.dataset_generation.entities import DatasetEntity


def to_json(records: Sequence[DatasetEntity]) -> str:
    """Serialize records to a JSON array string."""
    return json.dumps([record.as_dict() for record in records], indent=2, default=str)


def to_csv(records: Sequence[DatasetEntity]) -> str:
    """Serialize records to a CSV string.

    Column order follows the first record's field order. Returns an empty
    string for an empty sequence rather than raising, since "no rows" is a
    valid (if unusual) dataset export, not an error.
    """
    if not records:
        return ""

    rows = [record.as_dict() for record in records]
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def write_json(records: Sequence[DatasetEntity], path: str | Path) -> Path:
    """Write records to a JSON file, creating parent directories as needed."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(to_json(records), encoding="utf-8")
    return output_path


def write_csv(records: Sequence[DatasetEntity], path: str | Path) -> Path:
    """Write records to a CSV file, creating parent directories as needed."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(to_csv(records), encoding="utf-8", newline="")
    return output_path
