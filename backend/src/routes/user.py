"""
User settings routes for SafeFusion AI API v1.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.middleware.auth import CurrentUserDep
from src.repositories.user import UserRepository
from src.schemas.request.user import UserPasswordUpdate, UserPreferencesUpdate, UserProfileUpdate
from src.schemas.response.user import UserIntegrationsResponse, UserPreferencesResponse, UserProfileResponse
from src.utils.security import hash_password, verify_password

router: APIRouter = APIRouter(prefix="/user", tags=["User Settings"])

DbDep = Annotated[Session, Depends(get_db)]

def get_user_repository(db: DbDep) -> UserRepository:
    return UserRepository(db)

UserRepoDep = Annotated[UserRepository, Depends(get_user_repository)]

@router.get(
    "/profile",
    summary="Get user profile",
    response_model=UserProfileResponse,
)
def get_profile(current_user: CurrentUserDep) -> UserProfileResponse:
    return UserProfileResponse.model_validate(current_user)

@router.put(
    "/profile",
    summary="Update user profile",
    response_model=UserProfileResponse,
)
def update_profile(
    payload: UserProfileUpdate, current_user: CurrentUserDep, repo: UserRepoDep
) -> UserProfileResponse:
    update_data = payload.model_dump(exclude_unset=True)
    updated_user = repo.update(current_user.id, update_data)
    return UserProfileResponse.model_validate(updated_user)

@router.get(
    "/preferences",
    summary="Get user preferences",
    response_model=UserPreferencesResponse,
)
def get_preferences(current_user: CurrentUserDep) -> UserPreferencesResponse:
    return UserPreferencesResponse(preferences=current_user.preferences or {})

@router.put(
    "/preferences",
    summary="Update user preferences",
    response_model=UserPreferencesResponse,
)
def update_preferences(
    payload: UserPreferencesUpdate, current_user: CurrentUserDep, repo: UserRepoDep
) -> UserPreferencesResponse:
    current_prefs = dict(current_user.preferences or {})
    update_data = payload.model_dump(exclude_unset=True)
    current_prefs.update(update_data)
    
    updated_user = repo.update(current_user.id, {"preferences": current_prefs})
    return UserPreferencesResponse(preferences=updated_user.preferences or {})

@router.put(
    "/password",
    summary="Update user password",
    status_code=status.HTTP_204_NO_CONTENT,
)
def update_password(
    payload: UserPasswordUpdate, current_user: CurrentUserDep, repo: UserRepoDep
) -> None:
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match.",
        )
    
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password.",
        )
        
    repo.update(current_user.id, {"hashed_password": hash_password(payload.new_password)})

@router.get(
    "/integrations",
    summary="Get user integrations status",
    response_model=UserIntegrationsResponse,
)
def get_integrations(current_user: CurrentUserDep) -> UserIntegrationsResponse:
    # In a real system, you'd check active connections or stored keys.
    # Here we return a mock response matching the frontend UI requirements.
    return UserIntegrationsResponse()
