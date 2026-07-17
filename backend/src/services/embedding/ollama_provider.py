"""Ollama-backed implementation of :class:`~src.services.embedding.port.EmbeddingProviderPort`.

Wraps LangChain's ``OllamaEmbeddings`` client. This is the only module in
the embedding service that imports ``langchain_ollama`` — swapping to a
different provider (a hosted embeddings API, a different local runtime)
never touches ``service.py`` or its callers, only means writing a sibling
class that satisfies ``EmbeddingProviderPort`` and adding it here.

Default model is ``nomic-embed-text`` (768 dimensions), matching
``docs/tech-stack.md``'s local-first stack (Ollama + Llama 3). The model
must already be pulled on the target Ollama instance:
``ollama pull nomic-embed-text``.

Bounded and typed for graceful degradation: :attr:`~src.services.embedding.config.OllamaEmbeddingConfig.timeout_seconds`
is passed through to the underlying HTTP client (via ``client_kwargs``)
so a hung or unreachable Ollama server fails in bounded time, and any
connection/timeout/response failure is converted to
:class:`~src.services.embedding.exceptions.EmbeddingUnavailableError` —
the one type every caller (RAG retrieval, document ingestion) can catch
without importing ``httpx``/``ollama`` themselves. Defined in this
package (not ``src.ai``) since ``src.services`` must stay independent of
the AI package — see ``src.ai.config``'s module docstring for the same
rule in the other direction.
"""

from __future__ import annotations

from src.services.embedding.config import OllamaEmbeddingConfig
from src.services.embedding.exceptions import EmbeddingUnavailableError
from src.utils.logger import get_logger


logger = get_logger(__name__)

# nomic-embed-text's fixed output width. Used only as a fallback when a
# provider instance is constructed but never asked to embed anything yet
# (so `.dimensions` has an answer before the first real call) — actual
# embed calls always report the true vector length via `_dimensions`.
_DEFAULT_NOMIC_EMBED_TEXT_DIMENSIONS = 768


class OllamaEmbeddingProvider:
    """Generates text embeddings via a local Ollama server.

    Args:
        config: Model name, Ollama server URL, and request timeout.
            Defaults to ``OllamaEmbeddingConfig()`` (``nomic-embed-text``
            against ``http://localhost:11434``, overridable via the
            ``OLLAMA_EMBEDDING_MODEL`` / ``OLLAMA_BASE_URL`` /
            ``OLLAMA_EMBEDDING_TIMEOUT_SECONDS`` settings).

    Raises:
        ImportError: If ``langchain-ollama`` is not installed.
    """

    def __init__(self, config: OllamaEmbeddingConfig | None = None) -> None:
        # Imported lazily so importing this module (or the embedding
        # package's Protocol/schemas) never requires langchain-ollama to be
        # installed unless an Ollama-backed provider is actually constructed.
        from langchain_ollama import OllamaEmbeddings

        self._config = config or OllamaEmbeddingConfig()
        self._client = OllamaEmbeddings(
            model=self._config.model,
            base_url=self._config.base_url,
            client_kwargs={"timeout": self._config.timeout_seconds},
        )
        self._dimensions: int | None = None

    @property
    def model_name(self) -> str:
        return self._config.model

    @property
    def dimensions(self) -> int:
        return self._dimensions or _DEFAULT_NOMIC_EMBED_TEXT_DIMENSIONS

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts via Ollama, returning one vector per input.

        Raises:
            ValueError: If ``texts`` is empty, or Ollama returns a
                different number of vectors than inputs (indicates a
                provider-side bug or a partial failure mid-batch).
            EmbeddingUnavailableError: If Ollama is unreachable, times
                out, or returns an error response.
        """
        if not texts:
            raise ValueError("texts must not be empty")

        logger.info("Embedding batch model=%s count=%d", self._config.model, len(texts))
        try:
            vectors = self._client.embed_documents(texts)
        except Exception as exc:  # noqa: BLE001 - any transport/response failure degrades the same way
            raise EmbeddingUnavailableError(
                f"Ollama embedding call failed (model={self._config.model}): {exc}"
            ) from exc

        if len(vectors) != len(texts):
            raise ValueError(
                f"Ollama returned {len(vectors)} embeddings for {len(texts)} inputs"
            )
        self._record_dimensions(vectors)
        return vectors

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query string via Ollama.

        Raises:
            ValueError: If ``text`` is empty.
            EmbeddingUnavailableError: If Ollama is unreachable, times
                out, or returns an error response.
        """
        if not text:
            raise ValueError("text must not be empty")

        try:
            vector = self._client.embed_query(text)
        except Exception as exc:  # noqa: BLE001 - any transport/response failure degrades the same way
            raise EmbeddingUnavailableError(
                f"Ollama embedding call failed (model={self._config.model}): {exc}"
            ) from exc
        self._record_dimensions([vector])
        return vector

    def _record_dimensions(self, vectors: list[list[float]]) -> None:
        if self._dimensions is None and vectors:
            self._dimensions = len(vectors[0])
