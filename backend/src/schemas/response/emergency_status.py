"""Response schemas for the GET /emergency/status endpoint."""

from src.models.enums import RiskLevel
from src.schemas.base import AppBaseModel


class ZoneEmergencyStatusResponse(AppBaseModel):
    """Emergency risk snapshot for a single zone (no action detail)."""

    zone: str
    risk_score: float
    risk_level: RiskLevel
    action_count: int


class EmergencyStatusResponse(AppBaseModel):
    """Plant-wide emergency status snapshot."""

    zone_count: int
    in_emergency: bool
    zones: list[ZoneEmergencyStatusResponse]
