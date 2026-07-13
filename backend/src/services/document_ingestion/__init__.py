"""Document ingestion pipeline: load, clean, and tag source documents for RAG chunking."""

from src.services.document_ingestion.pipeline import DocumentIngestionPipeline
from src.services.document_ingestion.schemas import DocumentMetadata, IngestedDocument

__all__ = ["DocumentIngestionPipeline", "DocumentMetadata", "IngestedDocument"]
