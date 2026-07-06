"""
Application settings module for SafeFusion AI.

Loads all configuration from environment variables or a .env file
using Pydantic Settings v2. Every field is type-annotated and
validated at startup — the application will not start if required
values are missing or malformed.
"""

from typing import List

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
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings: Settings = Settings()
