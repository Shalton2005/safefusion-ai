"""RAG document ingestion runner for SafeFusion AI.

Scans ``settings.RAG_DOCUMENTS_DIR`` (default ``backend/rag/``) for
supported source files (PDF/Markdown/TXT — see
``src.services.document_ingestion.loaders``), and for each one:

    1. Load + clean (``DocumentIngestionPipeline``).
    2. Chunk (``TextChunker``, sized for regulatory text — see
       ``settings.RAG_CHUNK_SIZE``/``RAG_CHUNK_OVERLAP``), resolving a
       page number per chunk from the source's page offset table.
    3. Embed every chunk (``EmbeddingService`` / Ollama ``nomic-embed-text``).
    4. Store as ``document_embeddings`` rows (``DocumentEmbeddingRepository``).

Incremental by design: each file's SHA-256 content hash is computed
before loading and stored on every one of its chunks' ``chunk_metadata``.
A file is skipped entirely — no load, chunk, or embed work — when a
chunk already exists for that exact ``(source, content_hash)`` pair,
i.e. it was already ingested and hasn't changed since. A file whose
content *has* changed (same path, different hash — or a stale index-only
row from a previous partial run) has its old chunks deleted via
``delete_by_source`` before re-ingesting, so re-running this script never
accumulates duplicate or stale embeddings for the same source.

Usage:
    cd backend
    python scripts/ingest_rag_documents.py
    python scripts/ingest_rag_documents.py --force   # re-ingest every file regardless of hash
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
from pathlib import Path

# Ensure `src.*` imports resolve when run as a script from backend/scripts.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config.settings import settings
from src.database.session import SessionLocal
from src.repositories.document_embedding import DocumentEmbeddingRepository
from src.services.chunking.chunker import TextChunker
from src.services.chunking.config import ChunkingConfig
from src.services.document_ingestion.pipeline import DocumentIngestionPipeline
from src.services.embedding.config import OllamaEmbeddingConfig
from src.services.embedding.ollama_provider import OllamaEmbeddingProvider
from src.services.embedding.service import EmbeddingService
from src.utils.logger import get_logger

logger = get_logger(__name__)

#: Chunks per Ollama embedding request. Small enough that even a slow
#: CPU-only embedding pass comfortably finishes within
#: OLLAMA_EMBEDDING_TIMEOUT_SECONDS per batch (see the call site in
#: `main()`), large enough to not turn ingestion into hundreds of
#: separate HTTP round-trips for a big document.
_EMBEDDING_BATCH_SIZE = 20


def _content_hash(path: Path) -> str:
    """SHA-256 of the file's raw bytes — the incremental-ingestion key.

    Hashing bytes (not extracted text) means the hash is computed before
    any load/parse work happens, so an unchanged file is skipped with
    zero PDF-parsing or embedding cost — only a filesystem read.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _already_indexed(repository: DocumentEmbeddingRepository, source: str, content_hash: str) -> bool:
    """Whether ``source`` already has chunks stored for this exact content hash.

    A source with *no* stored chunks, or with chunks whose hash doesn't
    match (the file changed since last ingestion), is not considered
    indexed — the caller re-ingests it after clearing any stale rows.
    """
    existing = repository.get_by_source(source)
    if not existing:
        return False
    return any((row.chunk_metadata or {}).get("content_hash") == content_hash for row in existing)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest RAG source documents into pgvector.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-ingest every file regardless of whether its content hash is already indexed.",
    )
    args = parser.parse_args()

    documents_dir = Path(settings.RAG_DOCUMENTS_DIR)
    if not documents_dir.is_absolute():
        documents_dir = Path(__file__).resolve().parents[1] / documents_dir
    if not documents_dir.is_dir():
        print(f"RAG documents directory not found: {documents_dir}")
        sys.exit(1)

    ingestion_pipeline = DocumentIngestionPipeline()
    chunker = TextChunker(ChunkingConfig(chunk_size=settings.RAG_CHUNK_SIZE, chunk_overlap=settings.RAG_CHUNK_OVERLAP))
    embedding_provider = OllamaEmbeddingProvider(
        OllamaEmbeddingConfig(
            model=settings.OLLAMA_EMBEDDING_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            # Longer than the live app's default (15s, tuned for a single
            # small query at request time) — bulk ingestion embeds larger
            # batches and CPU-only Ollama is slow, so this script needs
            # more headroom per call than the app-wide default provides.
            timeout_seconds=120.0,
        )
    )
    embedding_service = EmbeddingService(embedding_provider)

    db = SessionLocal()
    try:
        repository = DocumentEmbeddingRepository(db)

        from src.services.document_ingestion.loaders import supported_suffixes

        suffixes = set(supported_suffixes())
        source_files = sorted(p for p in documents_dir.glob("*") if p.is_file() and p.suffix.lower() in suffixes)

        if not source_files:
            print(f"No supported documents found in {documents_dir}")
            return

        documents_indexed = 0
        documents_skipped = 0
        chunks_created = 0

        for path in source_files:
            source = str(path)
            content_hash = _content_hash(path)

            if not args.force and _already_indexed(repository, source, content_hash):
                logger.info("Skipping already-indexed document source=%s", source)
                documents_skipped += 1
                continue

            existing_count = len(repository.get_by_source(source))
            if existing_count:
                deleted = repository.delete_by_source(source)
                logger.info(
                    "Re-ingesting changed/forced document source=%s (removed %d stale chunk(s))", source, deleted
                )

            try:
                document = ingestion_pipeline.ingest_file(path)
            except Exception:
                logger.warning("Skipping document that failed to ingest source=%s", source, exc_info=True)
                continue

            chunks = chunker.chunk_document(document)
            if not chunks:
                logger.warning("No chunks produced for source=%s (empty or whitespace-only content)", source)
                continue

            # content_hash rides in every chunk's metadata (not a separate
            # per-document table) so incremental-ingestion detection can
            # reuse the same DocumentEmbeddingRepository.get_by_source
            # lookup every other read path already uses — no schema change.
            from dataclasses import replace

            tagged_chunks = [
                replace(chunk, metadata={**chunk.metadata, "content_hash": content_hash}) for chunk in chunks
            ]

            # Embedded in small batches, not one call for the whole
            # document: a single request for e.g. 300+ chunks routinely
            # exceeds OLLAMA_EMBEDDING_TIMEOUT_SECONDS (15s, tuned for the
            # live app's small per-request payloads, not bulk ingestion) on
            # CPU-only Ollama — batching keeps each request's latency well
            # under that budget without having to raise the app-wide
            # timeout just for this one-off script.
            embedded_chunks = []
            for batch_start in range(0, len(tagged_chunks), _EMBEDDING_BATCH_SIZE):
                batch = tagged_chunks[batch_start : batch_start + _EMBEDDING_BATCH_SIZE]
                embedded_chunks.extend(embedding_service.embed_chunks(batch))
                print(f"  embedded {min(batch_start + _EMBEDDING_BATCH_SIZE, len(tagged_chunks))}/{len(tagged_chunks)} chunks")

            repository.store_embedded_chunks(embedded_chunks)

            documents_indexed += 1
            chunks_created += len(embedded_chunks)
            print(f"Indexed {path.name}: {len(embedded_chunks)} chunk(s)")

    finally:
        db.close()

    print("\nRAG ingestion completed.")
    print(f"  Documents indexed: {documents_indexed}")
    print(f"  Documents skipped (already indexed): {documents_skipped}")
    print(f"  Chunks created: {chunks_created}")
    print(f"  Embedding model: {embedding_provider.model_name}")


if __name__ == "__main__":
    main()
