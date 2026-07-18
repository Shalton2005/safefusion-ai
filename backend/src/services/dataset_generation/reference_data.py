"""Static reference pools (names, catalogs, vocabularies) for dataset generators.

Kept separate from the generator logic itself so the pools can be extended
or swapped (e.g. for a different plant naming convention) without touching
any generator's control flow.
"""

from __future__ import annotations

FIRST_NAMES: list[str] = [
    "Aarav", "Vikram", "Kiran", "Sana", "Neha", "Rohan", "Isha", "Deepak",
    "Priya", "Ananya", "Rahul", "Meera", "Kabir", "Nisha", "Arjun", "Tarun",
    "Leena", "Dev", "Pooja", "Harsh",
]

LAST_NAMES: list[str] = [
    "Sharma", "Verma", "Patel", "Nair", "Iyer", "Singh", "Mehta", "Reddy",
    "Das", "Gupta",
]

WORKER_PROFILES: list[tuple[str, str]] = [
    ("Operations", "Process Technician"),
    ("Operations", "Field Operator"),
    ("Safety", "Safety Officer"),
    ("Maintenance", "Maintenance Engineer"),
    ("Utilities", "Control Room Operator"),
    ("Process", "Shift Supervisor"),
]

SHIFTS: list[str] = ["Morning", "Afternoon", "Night"]

SHIFT_HOURS: dict[str, tuple[int, int]] = {
    "Morning": (6, 14),
    "Afternoon": (14, 22),
    "Night": (22, 6),
}

ZONE_CATALOG: list[tuple[str, str, str, str, bool]] = [
    # (zone_id, name, building, hazard_category, is_restricted)
    ("Tank-Farm", "Tank Farm", "Building 1", "flammable_liquids", True),
    ("Boiler-Area", "Boiler Area", "Building 2", "high_pressure_steam", True),
    ("Zone-A", "Process Unit A", "Building 3", "toxic_gas", False),
    ("Zone-B", "Process Unit B", "Building 3", "electrical", False),
    ("Zone-C", "Process Unit C", "Building 4", "confined_space", False),
    ("Zone-D", "Utilities Yard", "Building 5", "general", False),
    ("Confined-Space-1", "Vessel Entry Point 1", "Building 4", "confined_space", True),
]

EQUIPMENT_CATEGORIES: list[str] = [
    "Pump", "Compressor", "Valve", "Sensor Array", "Vessel", "Heat Exchanger",
    "Boiler", "Electrical Panel", "Ventilation Fan", "Safety Relief Valve",
]

EQUIPMENT_MANUFACTURERS: list[str] = [
    "Emerson", "Honeywell", "Siemens", "ABB", "Yokogawa", "Schneider Electric",
]

EQUIPMENT_CRITICALITY: list[str] = ["low", "medium", "high", "safety_critical"]

TEAMS: list[str] = [
    "Mechanical Team Bravo", "Operations Team Alpha", "Utilities Team Echo",
    "Process Team Delta", "Electrical Team Sigma", "Safety Response Team",
]

SAFETY_OFFICERS: list[str] = [
    "Safety Officer Patel", "Safety Officer Sharma", "Safety Officer Nair",
    "Safety Officer Reddy",
]
