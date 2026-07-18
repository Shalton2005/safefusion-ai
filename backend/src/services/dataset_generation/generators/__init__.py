"""Per-entity dataset generators for SafeFusion AI.

Each module exposes one pure function ``generate_<entity>(context, ...)
-> list[Entity]``. Generators that reference other entities (e.g. workers
need zones, permits need zones and equipment) take the already-generated
list as an argument rather than generating their own — this keeps the
dependency direction explicit and lets ``DatasetGenerationService`` control
generation order without any generator reaching into another's internals.
"""

from src.services.dataset_generation.generators.equipment import generate_equipment
from src.services.dataset_generation.generators.maintenance import generate_maintenance_records
from src.services.dataset_generation.generators.permits import generate_permits
from src.services.dataset_generation.generators.sensors import generate_sensor_readings
from src.services.dataset_generation.generators.shift_schedules import generate_shift_schedules
from src.services.dataset_generation.generators.workers import generate_workers
from src.services.dataset_generation.generators.zones import generate_zones

__all__ = [
    "generate_zones",
    "generate_workers",
    "generate_equipment",
    "generate_permits",
    "generate_maintenance_records",
    "generate_shift_schedules",
    "generate_sensor_readings",
]
