"""LangChain document loader registry for the ingestion pipeline.

Each supported file type maps to a LangChain loader class plus the
constructor kwargs it needs. ``load_source`` is the seam the pipeline
calls through — it never imports a loader class directly, so adding a new
format (e.g. ``.docx``) is a one-line addition to ``_LOADERS`` rather than
a change to ``pipeline.py``.

LangChain loaders return ``langchain_core.documents.Document`` objects
(one per page for PDFs, one per file for Markdown/TXT). This module's
callers are responsible for merging/cleaning; loaders here only load.
"""

from __future__ import annotations

from pathlib import Path
from typing import Callable

from langchain_core.documents import Document

from src.utils.logger import get_logger


logger = get_logger(__name__)


class UnsupportedDocumentTypeError(ValueError):
    """Raised when a source file's extension has no registered loader."""

    def __init__(self, suffix: str) -> None:
        super().__init__(f"No document loader registered for file type '{suffix}'")
        self.suffix = suffix


def _load_pdf(path: Path) -> list[Document]:
    from langchain_community.document_loaders import PyPDFLoader

    return PyPDFLoader(str(path)).load()


def _load_markdown(path: Path) -> list[Document]:
    # LangChain's UnstructuredMarkdownLoader pulls in the heavyweight
    # `unstructured` package for what is, for our regulatory-document use
    # case, plain prose. TextLoader reads the raw Markdown source as-is;
    # `cleaning.py` normalizes whitespace, and the markup itself (headers,
    # lists) is left intact since it's useful structural signal for chunking.
    from langchain_community.document_loaders import TextLoader

    return TextLoader(str(path), encoding="utf-8").load()


def _load_text(path: Path) -> list[Document]:
    from langchain_community.document_loaders import TextLoader

    return TextLoader(str(path), encoding="utf-8").load()


# Suffix (lowercase, with leading dot) -> loader function. Extending to a
# new format means adding one entry here.
_LOADERS: dict[str, Callable[[Path], list[Document]]] = {
    ".pdf": _load_pdf,
    ".md": _load_markdown,
    ".markdown": _load_markdown,
    ".txt": _load_text,
}


def supported_suffixes() -> tuple[str, ...]:
    """Return every file suffix the pipeline can currently load."""
    return tuple(_LOADERS.keys())


def load_source(path: Path) -> list[Document]:
    """Load ``path`` into one or more raw LangChain ``Document`` objects.

    Raises:
        FileNotFoundError: If ``path`` does not exist.
        UnsupportedDocumentTypeError: If ``path``'s suffix has no registered loader.
    """
    if not path.is_file():
        raise FileNotFoundError(f"Document source not found: {path}")

    suffix = path.suffix.lower()
    loader_fn = _LOADERS.get(suffix)
    if loader_fn is None:
        raise UnsupportedDocumentTypeError(suffix)

    logger.info("Loading document source=%s file_type=%s", path, suffix)
    return loader_fn(path)
