"""Reusable text chunking service: split documents into overlapping chunks for RAG embedding."""

from src.services.chunking.chunker import TextChunker
from src.services.chunking.config import ChunkingConfig
from src.services.chunking.schemas import Chunk

__all__ = ["TextChunker", "ChunkingConfig", "Chunk"]
