"""User request models."""

from pydantic import BaseModel, ConfigDict, Field

class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = None
    email: str | None = None
    department: str | None = None
    phone_number: str | None = None


class UserPreferencesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    critical_alerts: bool | None = None
    high_severity_alerts: bool | None = None
    daily_summary: bool | None = None
    system_maintenance: bool | None = None
    theme: str | None = None


class UserPasswordUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str
    new_password: str = Field(min_length=8)
    confirm_password: str
