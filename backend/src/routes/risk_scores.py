"""
Risk Score routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.risk_score import RiskScoreRepository
from src.schemas.risk_score import RiskScoreCreate, RiskScoreRead, RiskScoreUpdate
from src.services.risk_score import RiskScoreService

router: APIRouter = APIRouter(prefix="/risk-scores", tags=["Risk Scores"])

DbDep = Annotated[Session, Depends(get_db)]


def get_risk_score_service(db: DbDep) -> RiskScoreService:
    """Create a service instance with repository dependencies."""
    return RiskScoreService(repository=RiskScoreRepository(db))


RiskScoreServiceDep = Annotated[RiskScoreService, Depends(get_risk_score_service)]


@router.get(
    "",
    summary="List risk scores",
    description="Retrieve a paginated list of recorded risk assessments and zone-level risk score analyses.",
    response_model=list[RiskScoreRead],
    response_description="List of risk score records.",
)
def list_risk_scores(
    service: RiskScoreServiceDep,
    skip: int = Query(0, ge=0, description="Number of risk score records to skip before returning results.", examples=[0]),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of risk score records to return.", examples=[100]),
) -> list[RiskScoreRead]:
    scores = service.list_risk_scores(skip=skip, limit=limit)
    return [RiskScoreRead.model_validate(score) for score in scores]


@router.get(
    "/{score_id}",
    summary="Get risk score by ID",
    response_model=RiskScoreRead,
    response_description="Risk score record.",
)
def get_risk_score(
    score_id: Annotated[uuid.UUID, Path(description="Unique identifier of the risk score record.")],
    service: RiskScoreServiceDep,
) -> RiskScoreRead:
    score = service.get_risk_score_by_id(score_id)
    if score is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk score not found.")
    return RiskScoreRead.model_validate(score)


@router.post(
    "",
    summary="Record a risk score",
    description="Persist a new AI-generated compound risk analysis result.",
    status_code=status.HTTP_201_CREATED,
    response_model=RiskScoreRead,
    response_description="Created risk score record.",
)
def create_risk_score(
    payload: Annotated[
        RiskScoreCreate,
        Body(
            openapi_examples={
                "default": {
                    "summary": "Create risk score example",
                    "value": {
                        "zone": "Zone-A",
                        "risk_score": 72.5,
                        "risk_level": "high",
                        "contributing_factors": "High gas reading, active hot-work permit, wet conditions.",
                        "recommendation": "Halt hot-work operations and ventilate zone immediately.",
                    },
                }
            }
        ),
    ],
    service: RiskScoreServiceDep,
) -> RiskScoreRead:
    score = service.create_risk_score(payload.model_dump())
    return RiskScoreRead.model_validate(score)


@router.put(
    "/{score_id}",
    summary="Update a risk score",
    response_model=RiskScoreRead,
    response_description="Updated risk score record.",
)
def update_risk_score(
    score_id: Annotated[uuid.UUID, Path(description="Unique identifier of the risk score record.")],
    payload: Annotated[
        RiskScoreUpdate,
        Body(
            openapi_examples={
                "revised-assessment": {
                    "summary": "Update risk assessment",
                    "value": {"risk_score": 61.0, "risk_level": "medium", "recommendation": "Continue monitoring and verify gas trend."},
                }
            }
        ),
    ],
    service: RiskScoreServiceDep,
) -> RiskScoreRead:
    updated = service.update_risk_score(score_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk score not found.")
    return RiskScoreRead.model_validate(updated)


@router.delete(
    "/{score_id}",
    summary="Delete a risk score",
    description="Delete a risk score record by its unique identifier.",
    status_code=status.HTTP_204_NO_CONTENT,
    response_description="Risk score record deleted successfully.",
)
def delete_risk_score(
    score_id: Annotated[uuid.UUID, Path(description="Unique identifier of the risk score record.")],
    service: RiskScoreServiceDep,
) -> Response:
    if not service.delete_risk_score(score_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk score not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
