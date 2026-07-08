"""
Application settings module for SafeFusion AI.

Loads all configuration from environment variables or a .env file
using Pydantic Settings v2. Every field is type-annotated and
validated at startup — the application will not start if required
values are missing or malformed.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised application configuration.

    Values are resolved in this priority order:
        1. Real environment variables.
        2. Variables defined in the .env file (if present).
        3. Field defaults declared below.
    """

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/safefusion_db"

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-this-secret-key-in-production"

    # ── Application ───────────────────────────────────────────────────────────
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "SafeFusion AI"
    PROJECT_VERSION: str = "1.0.0"

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
    ]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: object) -> bool:
        """Accept common environment names while preserving boolean DEBUG semantics."""
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"dev", "development"}:
                return True
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings: Settings = Settings()
