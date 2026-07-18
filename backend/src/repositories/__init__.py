"""
Repositories package for SafeFusion AI backend.

Re-exports all repository classes so callers can import them from
the package root::

    from src.repositories import WorkerRepository, AlertRepository
"""

from src.repositories.alert import AlertRepository
from src.repositories.base import BaseRepository
from src.repositories.document_embedding import DocumentEmbeddingRepository, SimilarityMatch
from src.repositories.incident import IncidentRepository
from src.repositories.maintenance import MaintenanceLogRepository
from src.repositories.permit import PermitRepository
from src.repositories.risk_score import RiskScoreRepository
from src.repositories.sensor import SensorRepository
from src.repositories.timeline_event import TimelineEventRepository
from src.repositories.worker import WorkerRepository

__all__: list[str] = [
    "BaseRepository",
    "WorkerRepository",
    "SensorRepository",
    "PermitRepository",
    "MaintenanceLogRepository",
    "IncidentRepository",
    "AlertRepository",
    "RiskScoreRepository",
    "DocumentEmbeddingRepository",
    "SimilarityMatch",
    "TimelineEventRepository",
]
