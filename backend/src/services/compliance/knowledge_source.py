"""Knowledge source seam for the Compliance Rule Engine.

The engine itself is purely rule-based (see ``rules.py``/``engine.py``):
it decides *whether* a rule is violated using plain attribute comparisons,
with no AI/ML involved. This module exists solely to prepare the
architecture for future Retrieval-Augmented Generation (RAG) integration,
per ``docs/tech-stack.md``, which already earmarks LangChain + pgvector
for retrieving supporting passages from the underlying regulatory
documents (OISD, Factory Act, DGMS, Incident Reports).

``ComplianceKnowledgeSourcePort`` is the seam a future retrieval backend
implements: given a violated rule code, return citation strings (e.g.
quoted clauses or document references) to attach to that violation.
``NullKnowledgeSource`` is the current default — it returns no citations,
so the engine works unchanged with zero RAG infrastructure in place.
Swapping in a real implementation (e.g. a LangChain retriever backed by
pgvector embeddings of the source documents) requires no change to the
engine or service — only to how the source is wired in at the route layer.
"""

from __future__ import annotations

from typing import Protocol


class ComplianceKnowledgeSourcePort(Protocol):
    """Contract for retrieving supporting context for a violated compliance rule."""

    def get_citations(self, rule_code: str) -> tuple[str, ...]:
        """Return citation strings (e.g. document passages/references) for ``rule_code``.

        Implementations may query a vector store, a document index, or any
        other retrieval mechanism. Must return an empty tuple rather than
        raising when no supporting context is available.
        """
        ...


class NullKnowledgeSource:
    """Default no-op knowledge source: returns no citations.

    Used until a real RAG-backed implementation is wired in.
    """

    def get_citations(self, rule_code: str) -> tuple[str, ...]:
        return ()
