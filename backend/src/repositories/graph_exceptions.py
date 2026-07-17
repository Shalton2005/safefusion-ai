"""Typed failure mode for the Neo4j-backed graph repository layer.

Kept in ``src.repositories`` (not ``src.ai.exceptions``) so this package
never depends on ``src.ai`` — the same layering rule ``src.ai.config``'s
module docstring states in the other direction, and the same pattern
``src.services.embedding.exceptions.EmbeddingUnavailableError`` follows.
:mod:`src.ai.exceptions` re-exports this type as
``src.ai.exceptions.GraphUnavailableError`` so AI-layer callers (the
Graph Knowledge agent) have one place to import AI-facing dependency
errors from, without this module needing to import ``src.ai`` itself.
"""

from __future__ import annotations


class GraphUnavailableError(Exception):
    """Raised when the knowledge graph (Neo4j) cannot be queried.

    Covers connection failures, query timeouts, and session expiry —
    from a caller's perspective all mean "no graph data is coming right
    now."
    """
