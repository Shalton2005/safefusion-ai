# SafeFusion AI - Backend

The core intelligence and API layer of SafeFusion AI, built with FastAPI and Python.

## Features
- **Asynchronous API**: High-throughput sensor and video processing via FastAPI.
- **AI Copilot**: LangGraph-based orchestrator utilizing local Ollama models.
- **Dual Databases**: PostgreSQL for relational data and Neo4j for spatial/graph topological data.
- **RAG Pipeline**: Vector embeddings and semantic search for safety document ingestion.

## Setup Instructions

### Prerequisites
- Python 3.10+
- PostgreSQL & Neo4j (Run via Docker Compose in the root directory)
- Ollama (running locally with your designated LLM installed)

### Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux/Mac
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Environment Variables:
   Copy `.env.example` to `.env` and fill in your database credentials:
   ```bash
   cp .env.example .env
   ```

### Running the Server
Run the FastAPI development server:
```bash
uvicorn src.server:app --reload --host 0.0.0.0 --port 8000
```
The Swagger UI documentation will be available at `http://localhost:8000/docs`.