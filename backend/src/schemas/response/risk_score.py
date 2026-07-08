"""RiskScore response models (Pydantic v2)."""

import uuid
from datetime import datetime

from src.validators.risk_score import RiskScoreSchema


class RiskScoreResponse(RiskScoreSchema):
    """Response model for RiskAssessment (risk score) resources."""

    id: uuid.UUID
    analyzed_at: datetime
    updated_at: datetime
