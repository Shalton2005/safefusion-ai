"""Permit validation service with configurable business rules."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from src.models.enums import PermitStatus, PermitValidationState
from src.models.permit import Permit


@dataclass(frozen=True)
class PermitValidationRules:
    """Configurable business rules for permit validation states."""

    valid_statuses: set[PermitStatus]
    pending_statuses: set[PermitStatus]
    invalid_statuses: set[PermitStatus]
    expired_grace_seconds: int = 0


class PermitValidationService:
    """Business service for classifying permit validity based on status and time."""

    def __init__(self, rules: PermitValidationRules) -> None:
        self._rules = rules

    def validate_permit(
        self,
        permit: Permit,
        now: datetime | None = None,
    ) -> PermitValidationState:
        """Return the validation state for a single permit."""
        state, _ = self._validate_permit_with_reason(permit=permit, now=now)
        return state

    def build_validation_summary(
        self,
        permits: list[Permit],
        now: datetime | None = None,
    ) -> dict:
        """Return structured validation summary for all provided permits."""
        current_time = now or datetime.now(UTC)
        counts = self._empty_counts()
        results: list[dict] = []

        for permit in permits:
            state, reason = self._validate_permit_with_reason(permit=permit, now=current_time)
            self._increment_count(counts, state)
            results.append(
                {
                    "permit_id": permit.id,
                    "permit_type": permit.permit_type,
                    "zone": permit.zone,
                    "status": permit.status,
                    "start_time": permit.start_time,
                    "end_time": permit.end_time,
                    "validation_state": state,
                    "reason": reason,
                }
            )

        results.sort(key=lambda row: (row["zone"], row["start_time"]))

        return {
            "generated_at": current_time,
            "counts": counts,
            "permits": results,
        }

    def _validate_permit_with_reason(
        self,
        permit: Permit,
        now: datetime | None = None,
    ) -> tuple[PermitValidationState, str]:
        current_time = now or datetime.now(UTC)
        expiry_threshold = permit.end_time + timedelta(seconds=self._rules.expired_grace_seconds)

        if permit.end_time <= permit.start_time:
            return PermitValidationState.INVALID, "Invalid time window: end_time must be after start_time"

        if current_time < permit.start_time:
            if permit.status in self._rules.pending_statuses:
                return PermitValidationState.PENDING, "Permit start_time is in the future"
            if permit.status in self._rules.invalid_statuses:
                return PermitValidationState.INVALID, f"Permit status {permit.status.value} is configured as invalid"
            return PermitValidationState.INVALID, "Permit is future-dated with a non-pending status"

        if permit.status in self._rules.invalid_statuses:
            return PermitValidationState.INVALID, f"Permit status {permit.status.value} is configured as invalid"

        if current_time > expiry_threshold:
            return PermitValidationState.EXPIRED, "Permit end_time is in the past"

        if permit.status in self._rules.valid_statuses:
            return PermitValidationState.VALID, "Permit is active within configured validation window"

        return PermitValidationState.INVALID, "Permit status is not configured as valid for current time"

    @staticmethod
    def _empty_counts() -> dict[str, int]:
        return {
            "valid": 0,
            "expired": 0,
            "pending": 0,
            "invalid": 0,
            "total": 0,
        }

    @staticmethod
    def _increment_count(counts: dict[str, int], state: PermitValidationState) -> None:
        if state == PermitValidationState.VALID:
            counts["valid"] += 1
        elif state == PermitValidationState.EXPIRED:
            counts["expired"] += 1
        elif state == PermitValidationState.PENDING:
            counts["pending"] += 1
        else:
            counts["invalid"] += 1
        counts["total"] += 1