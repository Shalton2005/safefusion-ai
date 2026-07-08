"""Alert request models (Pydantic v2)."""

from pydantic import Field

from src.models.enums import AlertStatus
from src.schemas.base import AppBaseModel
from src.validators.alert import AlertSchema


class AlertCreateRequest(AlertSchema):
    """Request model for creating an alert."""


class AlertUpdateRequest(AppBaseModel):
    """Request model for partially updating an alert."""

    status: AlertStatus | None = None
    message: str | None = Field(None, min_length=10, max_length=1000)
