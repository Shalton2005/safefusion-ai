> [!NOTE]
> **This is an early architectural design document created at the start of the project.** For the final, up-to-date documentation that strictly reflects the implemented Hackathon submission, please refer to the primary [docs/](./README.md) hub (including [pi/](./api/README.md) and [rchitecture/](./architecture/README.md)).

# SafeFusion AI - Technology Stack

## Frontend

### React + Vite
Purpose:
Develop a fast, responsive web dashboard.

### TypeScript
Purpose:
Type-safe frontend development.

### Tailwind CSS
Purpose:
Rapid UI development.

## Backend

### FastAPI

Purpose:
REST APIs and backend services.

## Database

### PostgreSQL

Purpose:
Store operational data.

Stores:
- Workers
- Sensors
- Permits
- Alerts
- Incidents

### pgvector

Purpose:
Store vector embeddings for RAG.


## AI

### Ollama

Purpose:
Run open-source LLM locally.

### Llama 3

Purpose:
Reasoning
Incident explanation
Recommendations

### LangGraph

Purpose:
Multi-agent workflow orchestration.

---

## Computer Vision

### YOLOv11

Purpose:
Detect

- Helmet
- Vest
- Worker
- Fire
- Smoke

### OpenCV

Purpose:
Video processing.

---

## RAG

### LangChain

Purpose:
Document retrieval.

Documents:

- OISD
- Factory Act
- DGMS
- Incident Reports

---

## Knowledge Graph

### Neo4j

Purpose:
Represent industrial relationships.

Examples:

Worker â†’ Zone

Zone â†’ Sensor

Permit â†’ Equipment

Equipment â†’ Incident

---

## Development Tools

- VS Code
- Git
- GitHub
- GitHub Copilot Pro
- Draw.io
- Docker (later)
