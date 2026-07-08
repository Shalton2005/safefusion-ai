"""Pydantic schemas for the RiskScore domain (request/response/validation split)."""

from src.schemas.request.risk_score import RiskScoreCreateRequest, RiskScoreUpdateRequest
from src.schemas.response.risk_score import RiskScoreResponse
from src.validators.risk_score import RiskScoreSchema

# Backward-compatible aliases used by existing routes/services.
RiskScoreCreate = RiskScoreCreateRequest
RiskScoreUpdate = RiskScoreUpdateRequest
RiskScoreRead = RiskScoreResponse

__all__: list[str] = [
    "RiskScoreSchema",
    "RiskScoreCreateRequest",
    "RiskScoreUpdateRequest",
    "RiskScoreResponse",
    "RiskScoreCreate",
    "RiskScoreUpdate",
    "RiskScoreRead",
]
