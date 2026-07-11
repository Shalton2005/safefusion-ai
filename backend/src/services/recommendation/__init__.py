"""Recommendation package for SafeFusion AI.

Combines Compound Risk, Emergency Response, and Compliance engine output
into a single, ordered list of operator recommendations. Purely
rule-based, no AI/ML involved. Priority weights and message templates are
centrally configured in ``src.config.recommendation_rules``.
"""

from src.services.recommendation.engine import RecommendationEngine
from src.services.recommendation.generators import (
    ComplianceRecommendationGenerator,
    CompoundRiskRecommendationGenerator,
    EmergencyResponseRecommendationGenerator,
    RecommendationGenerator,
)
from src.services.recommendation.recommendation_service import RecommendationService
from src.services.recommendation.schemas import Recommendation

__all__ = [
    "RecommendationEngine",
    "RecommendationGenerator",
    "ComplianceRecommendationGenerator",
    "CompoundRiskRecommendationGenerator",
    "EmergencyResponseRecommendationGenerator",
    "RecommendationService",
    "Recommendation",
]
