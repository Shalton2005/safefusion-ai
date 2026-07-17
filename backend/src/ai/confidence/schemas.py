"""Structured output contract for the Confidence Engine.

Kept separate from ``engine.py`` so callers that only need the result
shape (e.g. a Pydantic response model translation at the route layer)
don't need to import the scoring logic itself — the same split
``src.ai.agents.emergency_categorization`` uses between its dataclasses
and its categorization functions.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class ConfidenceLevel(str, Enum):
    """Human-readable band an overall score falls into.

    A plain float alone doesn't tell a reader "is 0.62 good or bad" —
    the level is what a UI or report actually renders. Boundaries live in
    :class:`~src.ai.confidence.engine.ConfidenceEngineConfig`
    (``level_thresholds``), not hardcoded here, since where "medium"
    ends and "high" begins is a tuning knob, not a fixed fact.
    """

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass(frozen=True, slots=True)
class ConfidenceFactor:
    """One named input to the overall score.

    Attributes:
        name: Stable identifier (e.g. ``"risk_agent"``,
            ``"retrieval_relevance"``, ``"knowledge_graph_matches"``,
            ``"agent_consistency"``) — see
            :mod:`~src.ai.confidence.engine` for the full factor set.
        score: This factor's own confidence, ``0.0``-``1.0``.
        weight: This factor's normalized share of the overall score
            (sums to ``~1.0`` across every factor present in a given
            :class:`ConfidenceBreakdown`, modulo floating-point rounding
            — factors with no signal for a request are simply absent,
            not zero-weighted).
        detail: Human-readable explanation of what produced ``score``
            (e.g. ``"3 zones assessed"``, ``"avg similarity 0.81 across
            4 chunks"``) — the "why" behind the number, for an
            explainability panel or audit log.
    """

    name: str
    score: float
    weight: float
    detail: str


@dataclass(frozen=True, slots=True)
class ConfidenceBreakdown:
    """Every factor that contributed to :class:`ConfidenceResult.overall_score`."""

    factors: tuple[ConfidenceFactor, ...]

    def factor(self, name: str) -> ConfidenceFactor | None:
        return next((f for f in self.factors if f.name == name), None)


@dataclass(frozen=True, slots=True)
class ConfidenceResult:
    """The Confidence Engine's full output for one request.

    Attributes:
        overall_score: Weighted combination of every present factor,
            ``0.0``-``1.0``. ``0.0`` if no agents ran / no factor had a
            signal.
        confidence_level: :attr:`overall_score` banded into a
            human-readable :class:`ConfidenceLevel`.
        breakdown: Per-factor scores, weights, and explanations that
            produced :attr:`overall_score`.
    """

    overall_score: float
    confidence_level: ConfidenceLevel
    breakdown: ConfidenceBreakdown
