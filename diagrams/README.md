# SafeFusion AI Diagrams & Visual Assets

This directory serves as the central repository for all visual assets, architecture diagrams, and UI wireframes used throughout the SafeFusion AI project.

## Folder Organization

- **`/` (Root)**: Contains overarching system architecture and high-level design files.
- **`/ui`**: Contains frontend wireframes, user navigation flows, and theme systems.
- **`/logo`**: Contains project branding and marketing assets.
- **`/data-flow`**, **`/deployment`**, **`/system`**: Reserved directories for future detailed mapping of data ingestion, container orchestration, and sub-system typologies.

---

## Diagram Index & Implementation Mapping

Below is a catalog of all currently existing diagrams, their intended purpose, and how they map directly to the implemented codebase.

### 1. High-Level Architecture
- **Files:** `high-level-architecture.png`, `high-level-architecture.drawio`
- **Purpose:** Illustrates the end-to-end system design, showing how data flows from cameras and sensors into the AI processing layer, and finally to the client.
- **Relationship to Implementation:** Accurately reflects the current stack: React + Zustand (Frontend) $\rightarrow$ FastAPI (Backend) $\rightarrow$ PostgreSQL/Neo4j (Databases) & Ollama/LangGraph (AI Inference). 

### 2. UI Theme & Color System
- **Files:** `ui/ui-theme-color-system.png`
- **Purpose:** Defines the visual design language, color palettes, and glassmorphism styling tokens for the application.
- **Relationship to Implementation:** Directly implemented via the global CSS utility variables and Tailwind configurations in the `/frontend` directory.

### 3. UI Wireframes & Layouts
- **Files:** `ui/dashboard-wireframe.png` (and `.drawio`)
  - **Purpose:** Layout blueprint for the main monitoring dashboard.
  - **Relationship:** Implemented in `frontend/src/features/dashboard`, dictating the grid layout for CCTV, risk scores, and alert panels.
- **Files:** `ui/ai-copilot-wireframe.png` (and `.drawio`)
  - **Purpose:** Interface design for the conversational AI agent, including reasoning streams and evidence panels.
  - **Relationship:** Implemented in `frontend/src/features/copilot`.
- **Files:** `ui/heatmap-wireframe.png` (and `.drawio`)
  - **Purpose:** Layout for visualizing historical incident density and hazard hot-spots.
  - **Relationship:** Implemented in the analytical and timeline views within the dashboard.

### 4. User Journeys & Topology
- **Files:** `ui/navigation-flow.png`
  - **Purpose:** Maps the user journey and routing paths across different views (Dashboard $\rightarrow$ Copilot $\rightarrow$ Settings).
  - **Relationship:** Implemented via React Router definitions in the frontend architecture.
- **Files:** `ui/plant-layout-sketch.png`
  - **Purpose:** A conceptual sketch of the physical industrial environment (zones, machines, sensor locations).
  - **Relationship:** Served as the foundational blueprint for creating the node/edge relationships in the Neo4j Knowledge Graph (`backend/src/graph_database/`).

### 5. Branding
- **Files:** `logo/SafeFusion AI Logo.png`
- **Purpose:** The primary logo for the SafeFusion AI platform.
- **Relationship:** Used across the GitHub repository (e.g., `README.md`) and within the frontend application's navigation header.