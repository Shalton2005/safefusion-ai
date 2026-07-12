"""Response schemas for the Emergency Response service."""

from src.models.enums import EmergencyActionType, RiskLevel
from src.schemas.base import AppBaseModel


class EmergencyActionMatchResponse(AppBaseModel):
    """A single emergency action dispatched for a zone."""

    action: EmergencyActionType
    triggered_by_rule: str
    explanation: str


class ZoneEmergencyResponseResultResponse(AppBaseModel):
    """Computed emergency response outcome for a single zone."""

    zone: str
    risk_score: float
    risk_level: RiskLevel
    actions: list[EmergencyActionMatchResponse]
    explanation: str


class EmergencyResponseResultResponse(AppBaseModel):
    """Result payload for a single emergency response run."""

    zone_count: int
    results: list[ZoneEmergencyResponseResultResponse]
