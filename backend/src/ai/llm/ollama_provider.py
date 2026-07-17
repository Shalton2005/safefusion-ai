"""Ollama-backed implementation of :class:`~src.ai.llm.port.LlmProviderPort`.

Wraps LangChain's ``ChatOllama`` client. This is the only module in the
LLM service that imports ``langchain_ollama`` — swapping to a different
provider (a hosted chat API, a different local runtime) never touches
``service.py`` or its callers, only means writing a sibling class that
satisfies ``LlmProviderPort`` and adding it here.

Default model is ``llama3.1:8b``, per this service's requirements. The
model must already be pulled on the target Ollama instance:
``ollama pull llama3.1:8b``.
"""

from __future__ import annotations

from src.ai.llm.config import LlmConfig
from src.utils.logger import get_logger


logger = get_logger(__name__)


class OllamaLlmProvider:
    """Generates text completions via a local Ollama server.

    Args:
        config: Model name, Ollama server URL, and sampling temperature.
            Defaults to ``LlmConfig()`` (``llama3.1:8b`` against
            ``http://localhost:11434``), overridable via the
            ``OLLAMA_LLM_MODEL`` / ``OLLAMA_BASE_URL`` /
            ``OLLAMA_LLM_TEMPERATURE`` settings.

    Raises:
        ImportError: If ``langchain-ollama`` is not installed.
    """

    def __init__(self, config: LlmConfig | None = None) -> None:
        # Imported lazily so importing this module (or the LLM
        # package's Protocol/schemas) never requires langchain-ollama to
        # be installed unless an Ollama-backed provider is actually
        # constructed — mirrors src.services.embedding.ollama_provider.
        from langchain_ollama import ChatOllama

        self._config = config or LlmConfig()
        self._client = ChatOllama(
            model=self._config.model,
            base_url=self._config.base_url,
            temperature=self._config.temperature,
        )

    @property
    def model_name(self) -> str:
        return self._config.model

    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        """Generate a response via Ollama.

        Raises:
            ValueError: If ``user_prompt`` is empty.
        """
        if not user_prompt or not user_prompt.strip():
            raise ValueError("user_prompt must not be empty")

        logger.info("LLM generate model=%s prompt_length=%d", self._config.model, len(user_prompt))
        response = self._client.invoke(
            [
                ("system", system_prompt),
                ("human", user_prompt),
            ]
        )
        return str(response.content)
