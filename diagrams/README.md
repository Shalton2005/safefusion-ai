# SafeFusion AI Diagrams & Visual Assets

This directory serves as the central repository for architecture diagrams and branding assets used throughout the SafeFusion AI project.

## Folder Organization

- **[`/` (Root)](./)**: Contains overarching system architecture and high-level design files.
- **[`/logo`](./logo/)**: Contains project branding and marketing assets.
- **[`/data-flow`](./data-flow/)**, **[`/deployment`](./deployment/)**, **[`/system`](./system/)**, **[`/ui`](./ui/)**: Reserved directories for future detailed mapping of data ingestion, container orchestration, sub-system typologies, and user interface wireframes.

---

## Diagram Index & Implementation Mapping

Below is a catalog of currently existing and committed diagrams:

### 1. High-Level Architecture
- **Files:** [`high-level-architecture.png`](./high-level-architecture.png), [`high-level-architecture.drawio`](./high-level-architecture.drawio)
- **Purpose:** Illustrates the end-to-end system design, showing how data flows from cameras and sensors into the AI processing layer, and finally to the client.
- **Relationship to Implementation:** Accurately reflects the current stack: React + Zustand (Frontend) $\rightarrow$ FastAPI (Backend) $\rightarrow$ PostgreSQL/Neo4j (Databases) & Ollama/LangGraph (AI Inference). 

### 2. Branding
- **Files:** [`SafeFusion AI Logo.png`](./logo/SafeFusion%20AI%20Logo.png)
- **Purpose:** The primary logo for the SafeFusion AI platform.
- **Relationship:** Used across the GitHub repository (e.g., `README.md`) and within the frontend application's navigation header.