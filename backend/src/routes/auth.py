"""
Authentication routes for SafeFusion AI API v1.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.middleware.auth import CurrentUserDep
from src.repositories.user import UserRepository
from src.schemas.request.auth import LoginRequest, RefreshRequest, RegisterRequest
from src.schemas.response.auth import TokenResponse, UserResponse
from src.services.auth import AuthService

router: APIRouter = APIRouter(prefix="/auth", tags=["Authentication"])

DbDep = Annotated[Session, Depends(get_db)]


def get_auth_service(db: DbDep) -> AuthService:
    """Create an auth service instance with repository dependencies."""
    return AuthService(repository=UserRepository(db))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


@router.post(
    "/register",
    summary="Register a new user",
    description="Create a new user account. New accounts are assigned the 'viewer' role by default.",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
    response_description="The newly created user account.",
)
def register(payload: RegisterRequest, service: AuthServiceDep) -> UserResponse:
    user = service.register(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    summary="Log in",
    description="Exchange email/password credentials for a JWT access/refresh token pair.",
    response_model=TokenResponse,
    response_description="Issued access and refresh tokens.",
)
def login(payload: LoginRequest, service: AuthServiceDep) -> TokenResponse:
    user = service.authenticate(email=payload.email, password=payload.password)
    return service.issue_tokens(user)


@router.post(
    "/refresh",
    summary="Refresh access token",
    description="Exchange a valid, unexpired refresh token for a new access/refresh token pair.",
    response_model=TokenResponse,
    response_description="Newly issued access and refresh tokens.",
)
def refresh(payload: RefreshRequest, service: AuthServiceDep) -> TokenResponse:
    return service.refresh(payload.refresh_token)


@router.get(
    "/me",
    summary="Get current user",
    description="Return the profile of the currently authenticated user.",
    response_model=UserResponse,
    response_description="The authenticated user's profile.",
)
def get_me(current_user: CurrentUserDep) -> UserResponse:
    return UserResponse.model_validate(current_user)
