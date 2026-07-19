"""Auth request models (Pydantic v2)."""

from pydantic import EmailStr, Field

from src.schemas.base import AppBaseModel


class RegisterRequest(AppBaseModel):
    """Request model for creating a new user account."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)


class LoginRequest(AppBaseModel):
    """Request model for exchanging credentials for a token pair."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(AppBaseModel):
    """Request model for exchanging a refresh token for a new token pair."""

    refresh_token: str
