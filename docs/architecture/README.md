# Architecture Overview

SafeFusion AI follows a modern, distributed microservices architecture designed for real-time industrial safety monitoring.

## System Components

### 1. Frontend (React + TypeScript)
- **Framework:** React 18, bootstrapped via Vite for rapid development.
- **State Management:** Global state management is handled using `Zustand`, with dedicated stores for Dashboard layouts, AI Copilot context, and Settings.
- **Styling:** CSS utility frameworks with customized glassmorphism UI tokens for a premium enterprise aesthetic.
- **Key Modules:** 
  - CCTV Live Grid (`features/computer-vision`)
  - AI Safety Copilot (`features/copilot`)
  - Knowledge Graph Viewer (`features/graph`)

### 2. Backend (FastAPI + Python)
- **Framework:** FastAPI running on Uvicorn, selected for its asynchronous capabilities and automatic OpenAPI (Swagger) documentation generation.
- **Structure:** Domain-driven design architecture separated into `/api` (routes), `/services` (business logic), `/models` (database schemas), and `/ai` (intelligence).
- **Concurrency:** Extensive use of asynchronous endpoints (`async def`) for high-throughput sensor data ingestion and video stream processing.

### 3. Database Layer
- **Relational DB:** PostgreSQL (via SQLAlchemy ORM) for structured user data, audit logs, and settings.
- **Graph DB:** Neo4j for mapping physical plant topologies, tracking worker-to-zone relationships, and calculating hazard propagation impact radii.
- **Vector Store:** Integrated within the AI pipeline for document embeddings in the RAG architecture.
