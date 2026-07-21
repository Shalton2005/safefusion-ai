"""Data model + JSON loader for Demo Scenario Playback timelines.

A scenario timeline is a JSON file under ``backend/demo_scenarios/`` — a
list of rows, each anchored to an elapsed-seconds offset from playback
start, describing how sensors/worker/permit/incident state should look at
that point in the story. Unlike ``src.services.demo_scenarios`` (which
feeds a single fixed snapshot through the rule engines purely in-memory),
a playback timeline is *replayed*: :class:`ScenarioPlaybackEngine` advances
through rows in real time and persists each row's state to Postgres, so
the existing polling dashboard sees it change over the course of the
playback.

Each row is a sparse patch, not a full snapshot: fields omitted from a row
(e.g. ``sensors`` on a row that only changes ``worker_status``) mean "no
change" — the previous value carries forward. This keeps scenario JSON
files short and mirrors how a real incident narrative is usually written
(only the deltas that matter at each beat).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from src.models.enums import IncidentType, PermitStatus, PermitType, SeverityLevel, WorkerStatus

#: Directory every scenario timeline JSON file lives in.
SCENARIOS_DIR: Path = Path(__file__).resolve().parents[3] / "demo_scenarios"


@dataclass(frozen=True)
class ScenarioSensorReading:
    """One sensor's value at a given row, keyed by a stable ``sensor_id`` string."""

    sensor_id: str
    sensor_type: str
    value: float
    unit: str


#: Fixed vocabulary of scripted CV overlay classes a scenario row may declare.
#: Deliberately small and closed — exactly the six classes required for the
#: demo (see ``ScenarioCvEvent``'s docstring for why these are authored,
#: not inferred).
CV_EVENT_LABELS: frozenset[str] = frozenset(
    {
        "helmet_worn",
        "helmet_not_worn",
        "safety_vest",
        "smoke",
        "fire",
        "restricted_zone_entry",
    }
)


@dataclass(frozen=True)
class ScenarioCvEvent:
    """One scripted, hand-authored computer-vision overlay box for a scenario row.

    Distinct from ``video_detection.py``'s real (but generic-COCO, PPE-blind)
    YOLO inference: a stock COCO checkpoint has no helmet/vest/fire/smoke/
    restricted-zone classes, so there is no honest way to make a real model
    produce these labels without a PPE-trained checkpoint (not present in
    this project). These boxes are instead authored by the scenario itself,
    exactly like its sensor readings and incidents — the frontend renders
    them as an overlay layer clearly labelled as scenario-driven, never
    presented as live model inference. Coordinates are normalised 0-1,
    matching every other bounding box in this codebase (see
    ``src.services.computer_vision.schemas.BoundingBox``).
    """

    label: str
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float

    def __post_init__(self) -> None:
        if self.label not in CV_EVENT_LABELS:
            raise ValueError(f"Unknown CV event label {self.label!r}; must be one of {sorted(CV_EVENT_LABELS)}")


@dataclass(frozen=True)
class ScenarioIncident:
    """An incident to create when this row plays, in the scenario's zone."""

    severity: SeverityLevel
    incident_type: IncidentType
    description: str
    root_cause: str | None = None


@dataclass(frozen=True)
class ScenarioWorker:
    """The single worker a scenario tracks, identified by a stable employee id."""

    employee_id: str
    name: str
    department: str
    role: str
    shift: str


@dataclass(frozen=True)
class ScenarioPermit:
    """The single permit a scenario tracks, covering the scenario's zone."""

    permit_id: str
    permit_type: PermitType
    issued_by: str
    assigned_team: str
    start_offset_hours: float
    end_offset_hours: float


@dataclass(frozen=True)
class ScenarioRow:
    """One beat in a scenario timeline.

    Every field except ``t`` is optional — omitted fields mean "carry the
    previous value forward" (see module docstring).
    """

    t: float
    label: str
    narration: str = ""
    sensors: tuple[ScenarioSensorReading, ...] = field(default_factory=tuple)
    worker_status: WorkerStatus | None = None
    ppe_status: bool | None = None
    permit_status: PermitStatus | None = None
    incident: ScenarioIncident | None = None
    #: Scripted CV overlay boxes active from this row onward, replacing
    #: whatever the previous row declared (not additive) — a row with an
    #: empty tuple explicitly clears the overlay (e.g. "Incident resolved"
    #: clearing a lingering "fire" box), while a row that omits this field
    #: entirely leaves the previous row's overlay untouched, consistent
    #: with every other sparse-patch field on this dataclass.
    cv_events: tuple[ScenarioCvEvent, ...] | None = None


@dataclass(frozen=True)
class ScenarioTimeline:
    """A fully loaded, ordered demo scenario timeline."""

    name: str
    title: str
    narrative: str
    zone: str
    worker: ScenarioWorker
    permit: ScenarioPermit
    rows: tuple[ScenarioRow, ...]
    #: Filename of the CCTV clip to play alongside this scenario, resolved
    #: against ``backend/data/cctv/`` and served at ``/media/cctv/<name>``
    #: (see the static mount in ``server.py``). Purely illustrative — the
    #: video has no bearing on any persisted state; only ``rows`` does.
    video_filename: str | None = None

    @property
    def duration_seconds(self) -> float:
        return self.rows[-1].t if self.rows else 0.0


def _parse_sensor(raw: dict) -> ScenarioSensorReading:
    return ScenarioSensorReading(
        sensor_id=raw["sensor_id"],
        sensor_type=raw["sensor_type"],
        value=float(raw["value"]),
        unit=raw["unit"],
    )


def _parse_cv_event(raw: dict) -> ScenarioCvEvent:
    return ScenarioCvEvent(
        label=raw["label"],
        confidence=float(raw.get("confidence", 0.9)),
        x_min=float(raw["x_min"]),
        y_min=float(raw["y_min"]),
        x_max=float(raw["x_max"]),
        y_max=float(raw["y_max"]),
    )


def _parse_incident(raw: dict) -> ScenarioIncident:
    return ScenarioIncident(
        severity=SeverityLevel(raw["severity"]),
        incident_type=IncidentType(raw["incident_type"]),
        description=raw["description"],
        root_cause=raw.get("root_cause"),
    )


def _parse_row(raw: dict) -> ScenarioRow:
    return ScenarioRow(
        t=float(raw["t"]),
        label=raw.get("label", ""),
        narration=raw.get("narration", ""),
        sensors=tuple(_parse_sensor(item) for item in raw.get("sensors", [])),
        worker_status=WorkerStatus(raw["worker_status"]) if "worker_status" in raw else None,
        ppe_status=raw.get("ppe_status"),
        permit_status=PermitStatus(raw["permit_status"]) if "permit_status" in raw else None,
        incident=_parse_incident(raw["incident"]) if "incident" in raw else None,
        cv_events=(
            tuple(_parse_cv_event(item) for item in raw["cv_events"]) if "cv_events" in raw else None
        ),
    )


def load_scenario_timeline(path: Path) -> ScenarioTimeline:
    """Load and parse one scenario timeline JSON file."""
    raw = json.loads(path.read_text(encoding="utf-8"))

    worker_raw = raw["worker"]
    worker = ScenarioWorker(
        employee_id=worker_raw["employee_id"],
        name=worker_raw["name"],
        department=worker_raw["department"],
        role=worker_raw["role"],
        shift=worker_raw["shift"],
    )

    permit_raw = raw["permit"]
    permit = ScenarioPermit(
        permit_id=permit_raw["permit_id"],
        permit_type=PermitType(permit_raw["permit_type"]),
        issued_by=permit_raw["issued_by"],
        assigned_team=permit_raw["assigned_team"],
        start_offset_hours=float(permit_raw["start_offset_hours"]),
        end_offset_hours=float(permit_raw["end_offset_hours"]),
    )

    rows = tuple(sorted((_parse_row(item) for item in raw["rows"]), key=lambda row: row.t))

    return ScenarioTimeline(
        name=raw["name"],
        title=raw["title"],
        narrative=raw.get("narrative", ""),
        zone=raw["zone"],
        worker=worker,
        permit=permit,
        rows=rows,
        video_filename=raw.get("video_filename"),
    )


def list_available_scenarios() -> list[str]:
    """Return the stable name of every scenario timeline JSON file in ``SCENARIOS_DIR``."""
    if not SCENARIOS_DIR.is_dir():
        return []
    names: list[str] = []
    for path in sorted(SCENARIOS_DIR.glob("*.json")):
        try:
            names.append(json.loads(path.read_text(encoding="utf-8"))["name"])
        except (json.JSONDecodeError, KeyError):
            continue
    return names


def load_scenario_by_name(name: str) -> ScenarioTimeline:
    """Load the scenario timeline whose ``name`` field matches, searching ``SCENARIOS_DIR``.

    Raises:
        FileNotFoundError: No scenario file in ``SCENARIOS_DIR`` has this name.
    """
    for path in sorted(SCENARIOS_DIR.glob("*.json")):
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        if raw.get("name") == name:
            return load_scenario_timeline(path)
    raise FileNotFoundError(f"No scenario named {name!r} found in {SCENARIOS_DIR}")
