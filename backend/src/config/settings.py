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

    # ── Sensor monitoring thresholds (rule-based baseline) ──────────────────
    SENSOR_GAS_WARNING_MAX: float = 60.0
    SENSOR_GAS_CRITICAL_MAX: float = 80.0

    SENSOR_TEMPERATURE_WARNING_MAX: float = 36.0
    SENSOR_TEMPERATURE_CRITICAL_MAX: float = 42.0

    SENSOR_PRESSURE_WARNING_MAX: float = 7.0
    SENSOR_PRESSURE_CRITICAL_MAX: float = 8.5

    SENSOR_HUMIDITY_WARNING_MAX: float = 62.0
    SENSOR_HUMIDITY_CRITICAL_MAX: float = 72.0

    SENSOR_SMOKE_WARNING_MAX: float = 4.0
    SENSOR_SMOKE_CRITICAL_MAX: float = 8.0

    # ── Permit validation rules ─────────────────────────────────────────────
    PERMIT_VALIDATION_VALID_STATUSES: list[str] = ["active"]
    PERMIT_VALIDATION_PENDING_STATUSES: list[str] = ["active"]
    PERMIT_VALIDATION_INVALID_STATUSES: list[str] = ["suspended"]
    PERMIT_VALIDATION_EXPIRED_GRACE_SECONDS: int = 0

    # ── Alert generation rules ───────────────────────────────────────────────
    ALERT_RESTRICTED_ZONES: list[str] = ["Boiler-Area", "Confined-Space-1"]

    # ── Risk score engine weights (v1) ───────────────────────────────────────
    # Each weight is the maximum point contribution (out of 100) of that
    # factor to a zone's overall risk score. Weights need not sum to 100 —
    # the engine clamps the final score to [0, 100].
    RISK_WEIGHT_CRITICAL_SENSORS: float = 40.0
    RISK_WEIGHT_WARNING_SENSORS: float = 15.0
    RISK_WEIGHT_EXPIRED_PERMITS: float = 25.0
    RISK_WEIGHT_RESTRICTED_ZONE_WORKERS: float = 20.0

    RISK_LEVEL_LOW_MAX: float = 25.0
    RISK_LEVEL_MEDIUM_MAX: float = 50.0
    RISK_LEVEL_HIGH_MAX: float = 75.0

    # ── Compound risk detection rule points ──────────────────────────────────
    # Each value is the point contribution (out of 100) a compound rule adds
    # to a zone's score when it fires. A zone's score is the sum of every
    # triggered rule's points, clamped to [0, 100].
    COMPOUND_RISK_POINTS_CRITICAL_SENSOR_WITHOUT_PERMIT: float = 35.0
    COMPOUND_RISK_POINTS_EXPIRED_PERMIT_WITH_WORKER: float = 30.0
    COMPOUND_RISK_POINTS_CRITICAL_SENSOR_WITH_WORKER: float = 40.0
    COMPOUND_RISK_POINTS_RESTRICTED_ZONE_WITHOUT_PERMIT: float = 30.0
    COMPOUND_RISK_POINTS_MULTIPLE_WARNING_SENSORS: float = 15.0
    COMPOUND_RISK_MULTIPLE_WARNING_MIN_COUNT: int = 2

    COMPOUND_RISK_LEVEL_LOW_MAX: float = 20.0
    COMPOUND_RISK_LEVEL_MEDIUM_MAX: float = 45.0
    COMPOUND_RISK_LEVEL_HIGH_MAX: float = 70.0

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
