"""Shared generation context for SafeFusion AI dataset generators.

Every per-entity generator (see ``src.services.dataset_generation.generators``)
takes a ``GenerationContext`` instead of reaching for global ``random``
state directly. This is what makes deterministic demo mode possible: one
seeded ``random.Random`` instance threaded through every generator produces
the same dataset on every run, while an unseeded context produces a fresh
dataset each time.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class GenerationContext:
    """Deterministic-or-random generation state shared across all entity generators.

    Args:
        seed: Fixes the underlying RNG for reproducible ("deterministic
            demo mode") output. ``None`` draws from an unseeded stream, so
            each run of the whole pipeline differs.
        anchor_time: The reference "now" every generator computes
            relative offsets from (hire dates, shift windows, permit
            timestamps, sensor readings). Defaults to construction time;
            pass an explicit value for reproducible golden-file tests
            independent of wall-clock time.
    """

    seed: int | None = None
    anchor_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    _random: random.Random = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._random = random.Random(self.seed)

    @property
    def rng(self) -> random.Random:
        return self._random
