"""Validation models for Worker payloads."""

from pydantic import Field, field_validator

from src.models.enums import WorkerStatus
from src.schemas.base import AppBaseModel


class WorkerSchema(AppBaseModel):
    """Canonical validation model for Worker domain fields."""

    name: str = Field(..., min_length=2, max_length=100, examples=["John Smith"])
    # Accepts numeric badge IDs (EMP-0001) and the demo-scenario IDs seeded
    # by scripts/seed_demo_data.py (e.g. EMP-DEMO-GASLEAK) — both are valid,
    # persisted employee_id values and must round-trip through this schema.
    employee_id: str = Field(..., pattern=r"^EMP-(\d{3,6}|DEMO-[A-Z]+)$", examples=["EMP-0001"])
    department: str = Field(..., min_length=2, max_length=100, examples=["Operations"])
    role: str = Field(..., min_length=2, max_length=100, examples=["Process Technician"])
    current_zone: str | None = Field(None, max_length=50, examples=["Zone-A"])
    ppe_status: bool = Field(False, description="True when worker is PPE-compliant")
    shift: str = Field(..., max_length=20, examples=["Morning"])
    status: WorkerStatus = Field(default=WorkerStatus.WORKING, examples=[WorkerStatus.WORKING])

    @field_validator("shift")
    @classmethod
    def validate_shift(cls, value: str) -> str:
        allowed = {"Morning", "Afternoon", "Night"}
        if value not in allowed:
            raise ValueError("shift must be one of: Morning, Afternoon, Night")
        return value
