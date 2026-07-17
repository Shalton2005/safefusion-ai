"""Typed failure mode for the embedding provider layer.

Kept in this package (not ``src.ai.exceptions``) because ``src.services``
must stay independent of ``src.ai`` — the same layering rule
``src.ai.config``'s module docstring states in the other direction.
:mod:`src.ai.exceptions` re-exports this type as
``src.ai.exceptions.EmbeddingUnavailableError`` so AI-layer callers (RAG
retrieval inside agents) have one place to import AI-facing dependency
errors from, without this module needing to import ``src.ai`` itself.
"""

from __future__ import annotations


class EmbeddingUnavailableError(Exception):
    """Raised when the embedding provider (e.g. Ollama) cannot embed text.

    Covers both "server unreachable" and "server too slow" — from a
    caller's perspective both mean "no embedding is coming right now."
    """
