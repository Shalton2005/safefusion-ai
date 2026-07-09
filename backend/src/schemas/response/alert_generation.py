"""Response schemas for alert generation runs."""

from src.schemas.base import AppBaseModel
from src.schemas.response.alert import AlertResponse


class AlertGenerationResultResponse(AppBaseModel):
    """Result payload for a single alert generation engine run."""

    generated_count: int
    alerts: list[AlertResponse]
