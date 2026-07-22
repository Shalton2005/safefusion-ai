# Operations & Deployment

This document covers the deployment, orchestration, and operational infrastructure of SafeFusion AI.

## Docker Orchestration

The platform infrastructure is fully containerized using Docker Compose (`docker-compose.yml`), ensuring seamless replication of the production environment for local testing and deployment.

### Core Services
- **PostgreSQL**: Relational database handling structured data, user profiles, and incident logs.
- **Neo4j**: Graph database configured for rapid traversal of spatial and topological relationships across the plant floor.
- **Ollama**: Local large language model engine handling all secure, on-device AI inference.

## Environment Configuration

The system is configured via `.env` files. Ensure the following critical variables are defined before initialization:
- `DATABASE_URL`: Connection string for the PostgreSQL instance.
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`: Credentials for the graph database.
- `OLLAMA_HOST`: Endpoint routing for the local LLM inference server.
- `LANGGRAPH_MODEL`: The designated AI model identifier (e.g., `llama3` or `claude-opus-4-8`).

## Hardware Acceleration (GPU)

To achieve real-time capabilities for the Computer Vision pipeline and the LangGraph Copilot agents, the backend and Docker configurations are optimized to support hardware acceleration.
- **GPU Passthrough:** The system leverages NVIDIA CUDA (or equivalent compute toolkits) to pass local GPU hardware directly into the Docker containers, dramatically accelerating Ollama inference and frame-by-frame video analytics.
- Ensure Docker Desktop or the Docker Engine is configured with the appropriate NVIDIA container toolkits before launching.
