"""Typed failure modes for the AI layer's external dependencies.

Every engine port the AI layer talks to (Ollama for LLM generation and
embeddings, Neo4j for the knowledge graph) can be unreachable, slow, or
erroring independently of the rest of the system. Wrapping each
dependency's raw exceptions (``httpx`` connection errors buried inside
LangChain, ``neo4j.exceptions.ServiceUnavailable``, etc.) into one of
these lets every catch site in :mod:`src.ai` — agents, the Supervisor,
:class:`~src.ai.copilot.service.AiCopilotService` — handle "this
dependency is down" as one well-known exception type instead of a grab
bag of third-party classes, without those callers needing to import
``httpx``/``neo4j`` themselves.

Every :class:`AiDependencyError` subclass carries the failed
dependency's name so a single ``except AiDependencyError as exc:`` can
still report *which* dependency failed (see ``exc.dependency``) without
narrowing to a specific subclass.

:class:`EmbeddingUnavailableError` and :class:`GraphUnavailableError`
are re-exported here from :mod:`src.services.embedding.exceptions` and
:mod:`src.repositories.graph_exceptions` respectively — neither is a
subclass of :class:`AiDependencyError`, since the packages that define
them (``src.services``, ``src.repositories``) must stay independent of
``src.ai`` (see ``src.ai.config``'s module docstring for the same
layering rule in the other direction) and so cannot import this
module's base class. Re-exporting them here just gives AI-layer callers
one import site for every dependency error they need to catch; catch
each by its own type, not through :class:`AiDependencyError`.
"""

from __future__ import annotations

from src.repositories.graph_exceptions import GraphUnavailableError as GraphUnavailableError
from src.services.embedding.exceptions import EmbeddingUnavailableError as EmbeddingUnavailableError


class AiDependencyError(Exception):
    """Base class for a failure in one of the AI layer's own external dependencies.

    Args:
        dependency: Short, stable identifier for the failed dependency
            (e.g. ``"ollama"``) — logged and surfaced in warnings so an
            operator can tell which backend is down without parsing the
            message text.
        message: Human-readable description of what went wrong.
    """

    def __init__(self, dependency: str, message: str) -> None:
        self.dependency = dependency
        super().__init__(message)


class LlmUnavailableError(AiDependencyError):
    """Raised when the LLM provider (Ollama) cannot generate a response.

    Covers both "server unreachable" (connection refused) and "server too
    slow" (timeout) — from a caller's perspective both mean "no answer is
    coming from this provider right now," and the graceful-degradation
    response is the same either way. Defined directly in this module
    (unlike the two re-exports above) since :mod:`src.ai.llm` — where the
    only provider that raises it lives — is itself part of ``src.ai``.
    """

    def __init__(self, message: str, *, dependency: str = "ollama") -> None:
        super().__init__(dependency, message)
