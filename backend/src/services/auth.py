"""
Auth service layer for SafeFusion AI.

Handles registration, login, and refresh-token exchange. Raises
``HTTPException`` directly (401/403/409) since these are user-facing
authentication outcomes, not internal domain errors.
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status

from src.models.enums import UserRole
from src.models.user import User
from src.repositories.user import UserRepository
from src.schemas.response.auth import TokenResponse
from src.utils.security import (
    TokenError,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from src.config.settings import settings


class AuthService:
    """Business orchestration service for authentication."""

    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository

    def register(self, email: str, password: str, full_name: str) -> User:
        """Create a new user account with a hashed password.

        Raises:
            HTTPException: 409 if the email is already registered.
        """
        if self._repository.get_by_email(email) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )
        return self._repository.create(
            {
                "email": email,
                "hashed_password": hash_password(password),
                "full_name": full_name,
                "role": UserRole.VIEWER,
            }
        )

    def authenticate(self, email: str, password: str) -> User:
        """Verify credentials and return the matching active user.

        Raises:
            HTTPException: 401 if credentials are invalid or the account is disabled.
        """
        user = self._repository.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account has been deactivated.",
            )
        return user

    def issue_tokens(self, user: User) -> TokenResponse:
        """Issue a fresh access/refresh token pair for a user."""
        return TokenResponse(
            access_token=create_access_token(str(user.id), user.role.value),
            refresh_token=create_refresh_token(str(user.id)),
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def refresh(self, refresh_token: str) -> TokenResponse:
        """Exchange a valid refresh token for a new token pair.

        Raises:
            HTTPException: 401 if the refresh token is invalid, expired, or
                its subject no longer maps to an active user.
        """
        try:
            payload = decode_token(refresh_token, expected_type=TokenType.REFRESH)
        except TokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            ) from exc

        user = self._repository.get_by_id(uuid.UUID(payload["sub"]))
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User no longer exists or is inactive.",
            )
        return self.issue_tokens(user)
