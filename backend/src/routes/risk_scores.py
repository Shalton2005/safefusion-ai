"""
Risk Score routes for SafeFusion AI API v1.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.repositories.risk_score import RiskScoreRepository
from src.schemas.risk_score import RiskScoreCreate, RiskScoreRead
from src.utils.response import error_response, success_response

router: APIRouter = APIRouter(prefix="/risk-scores", tags=["Risk Scores"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    summary="List risk scores",
    description="Return a paginated list of all recorded risk score analyses.",
    response_class=JSONResponse,
)
async def list_risk_scores(
    db: DbDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> JSONResponse:
    scores = RiskScoreRepository(db).get_all(skip=skip, limit=limit)
    return success_response(
        data=[RiskScoreRead.model_validate(r).model_dump(mode="json") for r in scores],
        message=f"{len(scores)} risk score(s) retrieved.",
    )


@router.get(
    "/latest",
    summary="Get the latest overall risk score",
    description="Return the most recently recorded risk score across all zones.",
    response_class=JSONResponse,
)
async def get_latest_risk_score(db: DbDep) -> JSONResponse:
    score = RiskScoreRepository(db).get_latest()
    if score is None:
        return success_response(data=None, message="No risk scores recorded yet.")
    return success_response(data=RiskScoreRead.model_validate(score).model_dump(mode="json"))


@router.get(
    "/zone/{zone}",
    summary="Get risk scores for a zone",
    description="Return all risk score records for the specified plant zone, newest first.",
    response_class=JSONResponse,
)
async def get_risk_scores_by_zone(zone: str, db: DbDep) -> JSONResponse:
    scores = RiskScoreRepository(db).get_by_zone(zone)
    return success_response(
        data=[RiskScoreRead.model_validate(r).model_dump(mode="json") for r in scores],
        message=f"{len(scores)} risk score(s) for zone '{zone}'.",
    )


@router.get(
    "/{score_id}",
    summary="Get risk score by ID",
    response_class=JSONResponse,
)
async def get_risk_score(score_id: uuid.UUID, db: DbDep) -> JSONResponse:
    score = RiskScoreRepository(db).get_by_id(score_id)
    if score is None:
        return error_response(message="Risk score not found.", status_code=404)
    return success_response(data=RiskScoreRead.model_validate(score).model_dump(mode="json"))


@router.post(
    "",
    summary="Record a risk score",
    description="Persist a new AI-generated compound risk analysis result.",
    status_code=status.HTTP_201_CREATED,
    response_class=JSONResponse,
)
async def create_risk_score(payload: RiskScoreCreate, db: DbDep) -> JSONResponse:
    score = RiskScoreRepository(db).create(payload.model_dump())
    return success_response(
        data=RiskScoreRead.model_validate(score).model_dump(mode="json"),
        message="Risk score recorded.",
        status_code=status.HTTP_201_CREATED,
    )
