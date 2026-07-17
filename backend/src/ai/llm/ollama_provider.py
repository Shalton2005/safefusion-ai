"""Ollama-backed implementation of :class:`~src.ai.llm.port.LlmProviderPort`.

Wraps LangChain's ``ChatOllama`` client. This is the only module in the
LLM service that imports ``langchain_ollama`` — swapping to a different
provider (a hosted chat API, a different local runtime) never touches
``service.py`` or its callers, only means writing a sibling class that
satisfies ``LlmProviderPort`` and adding it here.

Default model is ``llama3.1:8b``, per this service's requirements. The
model must already be pulled on the target Ollama instance:
``ollama pull llama3.1:8b``.

Bounded and typed for graceful degradation: :attr:`~src.ai.llm.config.LlmConfig.timeout_seconds`
is passed through to the underlying HTTP client (via ``client_kwargs``)
so a hung or unreachable Ollama server fails in bounded time rather than
blocking the calling request forever, and any connection/timeout/response
failure is converted to :class:`~src.ai.exceptions.LlmUnavailableError`
— a single, well-known type every caller in :mod:`src.ai` can catch
without importing ``httpx``/``ollama`` themselves.

Observability: the underlying model call is timed as
``operation=llm_generate`` via :func:`~src.utils.timing.timed`, tagged
with ``model=<name>`` — the response time figure asked for, measured at
the one place in this codebase that actually calls the model.

Also exposes :func:`check_ollama_reachable`, a standalone reachability
probe used by the ``/ai/health`` monitoring endpoint (see
``src/ai/monitoring/health.py``) — a plain ``httpx`` GET against
Ollama's own ``/api/tags`` listing endpoint, independent of
:class:`OllamaLlmProvider` (no ``ChatOllama``/``langchain_ollama``
import needed just to check if the server is up) and independent of any
model being pulled.
"""

from __future__ import annotations

import httpx

from src.ai.exceptions import LlmUnavailableError
from src.ai.llm.config import LlmConfig
from src.utils.logger import get_logger
from src.utils.timing import timed


logger = get_logger(__name__)


class OllamaLlmProvider:
    """Generates text completions via a local Ollama server.

    Args:
        config: Model name, Ollama server URL, sampling temperature, and
            request timeout. Defaults to ``LlmConfig()`` (``llama3.1:8b``
            against ``http://localhost:11434``), overridable via the
            ``OLLAMA_LLM_MODEL`` / ``OLLAMA_BASE_URL`` /
            ``OLLAMA_LLM_TEMPERATURE`` / ``OLLAMA_LLM_TIMEOUT_SECONDS``
            settings.

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
            client_kwargs={"timeout": self._config.timeout_seconds},
        )

    @property
    def model_name(self) -> str:
        return self._config.model

    def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        """Generate a response via Ollama.

        Raises:
            ValueError: If ``user_prompt`` is empty.
            LlmUnavailableError: If Ollama is unreachable, times out, or
                returns an error response.
        """
        if not user_prompt or not user_prompt.strip():
            raise ValueError("user_prompt must not be empty")

        logger.info("LLM generate model=%s prompt_length=%d", self._config.model, len(user_prompt))
        try:
            with timed(logger, "llm_generate", model=self._config.model):
                response = self._client.invoke(
                    [
                        ("system", system_prompt),
                        ("human", user_prompt),
                    ]
                )
        except Exception as exc:  # noqa: BLE001 - any transport/response failure degrades the same way
            raise LlmUnavailableError(
                f"Ollama LLM call failed (model={self._config.model}): {exc}"
            ) from exc
        return str(response.content)


def check_ollama_reachable(base_url: str, *, timeout_seconds: float = 5.0) -> bool:
    """Return ``True`` if the Ollama server at ``base_url`` responds, ``False`` otherwise.

    Hits ``/api/tags`` (Ollama's own "list locally available models"
    endpoint) rather than issuing a real generation/embedding call — a
    readiness probe should be cheap and side-effect-free, not spend a
    model inference just to answer "is the server up." Any failure
    (connection refused, timeout, non-2xx response) is swallowed and
    reported as ``False``; this function never raises, matching
    :func:`~src.graph_database.driver.verify_connectivity`'s contract so
    ``/ai/health`` can treat both dependency checks uniformly.
    """
    try:
        response = httpx.get(f"{base_url.rstrip('/')}/api/tags", timeout=timeout_seconds)
        return response.status_code < 400
    except Exception:  # noqa: BLE001 - a health probe must never raise, only report reachable/unreachable
        return False
