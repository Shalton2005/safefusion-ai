"""Response schemas for the Recommendation service."""

from src.models.enums import RecommendationSource
from src.schemas.base import AppBaseModel


class RecommendationResponse(AppBaseModel):
    """A single ordered operator recommendation."""

    source: RecommendationSource
    zone: str | None
    priority: int
    message: str
    reason: str


class RecommendationResultResponse(AppBaseModel):
    """Result payload for a recommendation generation run."""

    recommendation_count: int
    recommendations: list[RecommendationResponse]
