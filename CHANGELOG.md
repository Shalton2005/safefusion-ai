# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Initial Release (ET AI Hackathon 2.0)

### Added
- **Backend**: Scalable FastAPI backend foundation with PostgreSQL database integration.
- **Backend**: Emergency Response Engine for automated crisis protocols and workflows.
- **Backend**: Compound Risk Engine for calculating cumulative risk scores and scenario analysis.
- **Frontend**: Robust React application with a complete UI component library and theming system.
- **Frontend**: Global state management configured via Zustand.
- **Dashboard**: Live Monitoring dashboards with real-time worker, sensor, and permit tracking.
- **Dashboard**: Plant Safety Overview, Incident Summary, and Live Alerts panels.
- **Dashboard**: Professional concentric layout component for complex data visualizations.
- **AI**: Safety Copilot implementation with Agent Activity, Reasoning, and Explainable AI panels.
- **AI**: LangGraph integration for Supervisor Agent orchestration and state memory.
- **AI**: Full integration with Ollama for local LLM inference and response aggregation.
- **Computer Vision**: CCTV Live Camera Grid with multi-camera feed synchronization.
- **Computer Vision**: PPE Compliance tracking, Hazard Detection overlays, and confidence visualization.
- **Knowledge Graph**: Complete Neo4j backend integration with custom graph APIs.
- **Knowledge Graph**: Interactive Graph Visualization component with relationship details and legends.
- **RAG**: Document ingestion pipeline supporting context-aware retrieval and page citations.
- **Authentication**: Secure frontend login portal and authentication flows.
- **GPU Support**: Hardware-accelerated GPU passthrough configured for local Ollama inference in Docker.
- **Documentation**: Comprehensive Swagger API documentation automatically generated via FastAPI.
- **Documentation**: Core design architecture diagrams, wireframes, and UI workflows.

### Changed
- Refactored frontend API layer to support request cancellation and robust error handling.
- Migrated hardcoded dashboard widgets to dynamically load from live AI data feeds.
- Updated project file structure to support a distributed microservices architecture (Backend, Frontend, Knowledge).
- Refined the AI Safety Copilot interface to match a premium enterprise-quality design.

### Improved
- **Computer Vision**: Significantly enhanced CCTV pipeline performance and reduced incident spam.
- **Dashboard**: Enhanced widget layout, added dynamic emergency banners, and optimized render performance.
- **AI**: Enriched report aggregation with AI-driven metadata and explainability metrics.
- Enhanced UI keyboard accessibility for data tables.
- Implemented system-wide UI polish including micro-animations, glassmorphism, and responsive breakpoints.

### Fixed
- Addressed regression bugs related to AI verdicts, alert/risk-score spam, and video synchronization.
- Resolved broken and missing React components across dashboard routing and analytics pages.
- Fixed Neo4j Docker container orchestration and connection timeouts.
- Patched API endpoint validation errors and state desynchronization in the Zustand store.
- Corrected zooming and panning controls in the concentric Knowledge Graph layout.