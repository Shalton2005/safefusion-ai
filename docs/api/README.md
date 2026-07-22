# API Documentation

The SafeFusion AI backend exposes a robust, RESTful API layer built with FastAPI. All endpoints are fully typed and self-documenting.

## Interactive Docs
When the backend is running, the interactive Swagger UI is automatically available at:
`http://localhost:8000/docs`

## Key Endpoint Domains

The API is logically grouped into discrete routing modules under `/api/v1/`:

- **`/auth`**: Secure user authentication and session management.
- **`/dashboard`**: Aggregated widgets for the main dashboard, including compound risk scores and incident summaries.
- **`/computer_vision`**: Endpoints for handling CCTV stream metadata, PPE compliance rates, and hazard detection bounding boxes.
- **`/ai_copilot`**: Conversational endpoints for the safety copilot, providing agent reasoning streams and explainable AI metrics.
- **`/graph`**: Neo4j knowledge graph queries, node/edge retrieval, and incident impact radius calculations.
- **`/rag`**: Document ingestion pipelines, context-aware querying, and document citation retrieval.
- **`/emergency`**: Automated lockdown triggers, evacuation routing, and critical system-wide alerts.
- **`/monitoring` & `/alerts`**: Live sensor tracking and anomaly detection alerts.

## Design Patterns
- **Dependency Injection:** Used extensively for managing database sessions, authentication, and service classes.
- **Pydantic Validation:** All incoming HTTP requests and outgoing responses are strictly validated using Pydantic schemas (located in `backend/src/schemas/`), ensuring data integrity.
