"""Provider seam for the LLM service.

``LlmProviderPort`` is the contract every LLM backend implements. The
service layer (``service.py``) depends only on this Protocol, never on
a concrete provider class — swapping the model or runtime (Ollama
today; a hosted API, a different local runtime later) means adding a
new class that satisfies this Protocol and changing how it's wired in
at the call site. No change to ``LlmService`` or its callers.

Same pattern as ``src.services.embedding.port.EmbeddingProviderPort``.
"""

from __future__ import annotations

from typing import Protocol


class LlmProviderPort(Protocol):
    """Contract for turning a fully-assembled prompt into generated text."""

    @property
    def model_name(self) -> str:
        """The identifier of the model in use (e.g. ``"llama3.1:8b"``)."""
        ...

    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        """Generate a response for ``user_prompt`` under ``system_prompt``.

        Args:
            system_prompt: Instructions governing the model's behavior
                for this call (see :mod:`src.ai.llm.prompts` — this
                always originates from the centralized prompt module,
                never assembled ad hoc by a caller).
            user_prompt: The fully-assembled question + context block.

        Returns:
            The model's raw text response.
        """
        ...
