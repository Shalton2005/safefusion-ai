"""Dataclasses shared by the Recommendation Engine and service."""

from __future__ import annotations

from dataclasses import dataclass

from src.models.enums import RecommendationSource


@dataclass(frozen=True)
class Recommendation:
    """A single ordered operator recommendation produced from one engine's output.

    Attributes:
        source: Which engine produced this recommendation.
        zone: Plant zone the recommendation applies to, if applicable
            (compliance recommendations are per-incident, not per-zone,
            so this may be ``None``).
        priority: Sort key — **lower sorts first**. Computed from the
            centrally configured ``SOURCE_PRIORITY`` and a severity
            offset (see ``src.config.recommendation_rules``).
        message: Operator-facing recommendation text.
        reason: Short machine-readable identifier for what triggered this
            recommendation (action type, rule name, or compliance rule
            code) — useful for grouping/filtering, not for display.
    """

    source: RecommendationSource
    zone: str | None
    priority: int
    message: str
    reason: str
