"""Recommendation routes for SafeFusion AI API v1.

Thin Route -> Service -> Repository endpoint exposing the Recommendation
Engine, which combines Compound Risk, Emergency Response, and Compliance
engine output into a single, ordered list of operator recommendations.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.routes.compliance import get_compliance_service
from src.routes.emergency_response import get_emergency_response_service
from src.routes.monitoring import get_compound_risk_service
from src.schemas.response.recommendation import RecommendationResponse, RecommendationResultResponse
from src.services.compliance.compliance_service import ComplianceService
from src.services.compound_risk.compound_risk_service import CompoundRiskService
from src.services.emergency_response.emergency_response_service import EmergencyResponseService
from src.services.recommendation.engine import RecommendationEngine
from src.services.recommendation.generators import (
    ComplianceRecommendationGenerator,
    CompoundRiskRecommendationGenerator,
    EmergencyResponseRecommendationGenerator,
)
from src.services.recommendation.recommendation_service import RecommendationService
from src.services.recommendation.schemas import Recommendation

router: APIRouter = APIRouter(prefix="/recommendations", tags=["Recommendations"])

DbDep = Annotated[Session, Depends(get_db)]


def _build_recommendation_engine() -> RecommendationEngine:
    """Build the Recommendation Engine from the configured per-source generators."""
    return RecommendationEngine(
        compound_risk_generator=CompoundRiskRecommendationGenerator(),
        emergency_response_generator=EmergencyResponseRecommendationGenerator(),
        compliance_generator=ComplianceRecommendationGenerator(),
    )


def get_recommendation_service(
    db: DbDep,
    compound_risk_service: Annotated[CompoundRiskService, Depends(get_compound_risk_service)],
    emergency_response_service: Annotated[EmergencyResponseService, Depends(get_emergency_response_service)],
    compliance_service: Annotated[ComplianceService, Depends(get_compliance_service)],
) -> RecommendationService:
    """Create the recommendation service with all three upstream engines wired in."""
    return RecommendationService(
        engine=_build_recommendation_engine(),
        compound_risk=compound_risk_service,
        emergency_response=emergency_response_service,
        compliance=compliance_service,
    )


RecommendationServiceDep = Annotated[RecommendationService, Depends(get_recommendation_service)]


def _to_response(recommendations: list[Recommendation]) -> RecommendationResultResponse:
    return RecommendationResultResponse(
        recommendation_count=len(recommendations),
        recommendations=[
            RecommendationResponse(
                source=recommendation.source,
                zone=recommendation.zone,
                priority=recommendation.priority,
                message=recommendation.message,
                reason=recommendation.reason,
            )
            for recommendation in recommendations
        ],
    )


@router.get(
    "",
    summary="Get ordered operator recommendations",
    description=(
        "Runs the Compound Risk, Emergency Response, and Compliance engines "
        "against the latest monitoring and incident data, then combines "
        "their output into a single, priority-ordered list of operator "
        "recommendations. Equivalent to POST /recommendations/generate, "
        "provided as a plain read endpoint."
    ),
    response_model=RecommendationResultResponse,
    response_description="Ordered operator recommendations from all three engines.",
)
def get_recommendations(
    service: RecommendationServiceDep,
) -> RecommendationResultResponse:
    recommendations = service.generate_recommendations()
    return _to_response(recommendations)


@router.post(
    "/generate",
    summary="Generate ordered operator recommendations",
    description=(
        "Runs the Compound Risk, Emergency Response, and Compliance engines "
        "against the latest monitoring and incident data, then combines "
        "their output into a single, priority-ordered list of operator "
        "recommendations."
    ),
    response_model=RecommendationResultResponse,
    response_description="Ordered operator recommendations from all three engines.",
)
def generate_recommendations(
    service: RecommendationServiceDep,
) -> RecommendationResultResponse:
    recommendations = service.generate_recommendations()
    return _to_response(recommendations)
