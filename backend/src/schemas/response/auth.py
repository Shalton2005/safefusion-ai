"""Auth response models (Pydantic v2)."""

import uuid
from datetime import datetime

from src.models.enums import UserRole
from src.schemas.base import AppBaseModel


class UserResponse(AppBaseModel):
    """Response model for the current authenticated user."""

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class TokenResponse(AppBaseModel):
    """Response model for a freshly issued access/refresh token pair."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
