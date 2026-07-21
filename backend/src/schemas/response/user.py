"""User response models."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any

from src.models.enums import UserRole
from src.schemas.base import AppBaseModel


class UserProfileResponse(AppBaseModel):
    """Response model for the user profile settings."""
    
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    department: Optional[str] = None
    phone_number: Optional[str] = None
    employee_id: Optional[str] = None
    last_login: Optional[datetime] = None


class UserPreferencesResponse(AppBaseModel):
    """Response model for user preferences."""
    
    preferences: Dict[str, Any]


class UserIntegrationsResponse(BaseModel):
    """Response model for user integrations."""
    model_config = ConfigDict(from_attributes=True)
    
    rest_api: str = "Connected"
    websocket: str = "Connected"
    smtp: str = "Configured"
    last_sync: str = "Just now"
