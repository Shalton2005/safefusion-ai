"""Graph ingestion runner for SafeFusion AI.

Reads every Worker, Sensor, Permit, MaintenanceLog, Incident, and RiskScore
row from PostgreSQL and projects them into the Neo4j knowledge graph via
``GraphIngestionService`` (see ``src/services/graph_ingestion.py`` and
``docs/knowledge-graph-schema.md``).

Every write is a Cypher ``MERGE`` keyed on the PostgreSQL row's ``id``, so
this script is idempotent: running it repeatedly (e.g. on a schedule) only
creates nodes/relationships for new rows and refreshes properties on
existing ones — it never produces duplicates.

Usage:
    cd backend
    python scripts/ingest_graph.py
"""

from __future__ import annotations

import os
import sys

# Ensure `src.*` imports resolve when run as a script from backend/scripts.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.database.session import SessionLocal
from src.graph_database.session import graph_session
from src.repositories.graph_base import GraphBaseRepository
from src.repositories.incident import IncidentRepository
from src.repositories.maintenance import MaintenanceLogRepository
from src.repositories.permit import PermitRepository
from src.repositories.risk_score import RiskScoreRepository
from src.repositories.sensor import SensorRepository
from src.repositories.worker import WorkerRepository
from src.services.graph_ingestion import GraphIngestionService


def main() -> None:
    db = SessionLocal()
    try:
        with graph_session() as session:
            service = GraphIngestionService(
                graph_repository=GraphBaseRepository(session),
                worker_repository=WorkerRepository(db),
                sensor_repository=SensorRepository(db),
                permit_repository=PermitRepository(db),
                maintenance_repository=MaintenanceLogRepository(db),
                incident_repository=IncidentRepository(db),
                risk_score_repository=RiskScoreRepository(db),
            )
            counts = service.run()
    finally:
        db.close()

    print("Graph ingestion completed.")
    for entity_type, count in counts.items():
        print(f"  {entity_type}: {count}")


if __name__ == "__main__":
    main()
