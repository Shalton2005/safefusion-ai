# SafeFusion AI Knowledge Corpus

This directory serves as the root storage layer for the source documents that power the SafeFusion AI Retrieval-Augmented Generation (RAG) pipeline. 

## Purpose
The files placed within this directory constitute the "ground truth" knowledge base for the AI Safety Copilot. By providing the AI with domain-specific industrial regulations, internal SOPs, and historical reports, the system can generate highly accurate, context-aware answers accompanied by precise document citations.

## Folder Structure

| Folder | Contents / Purpose |
| --- | --- |
| [`factory-act/`](factory-act/) | Factory Act documents and related state-level Factory Rules. |
| [`oisd/`](oisd/) | OISD (Oil Industry Safety Directorate) standards and guidelines. |
| [`dgms/`](dgms/) | DGMS (Directorate General of Mines Safety) circulars and regulations. |
| [`sop/`](sop/) | Internal organizational Standard Operating Procedures. |
| [`incident-reports/`](incident-reports/) | Historical, anonymized incident and accident investigation reports. |

*(Note: These folders currently serve as structural placeholders. No regulatory documents or files have been uploaded yet.)*

## Supported Documents
The backend ingestion pipeline currently supports processing the following file formats:
- PDF (`.pdf`)
- Plain Text (`.txt`)
- Markdown (`.md`)
- Word Documents (`.docx`)

## Naming Convention
To ensure metadata is cleanly extracted during ingestion, follow this standard naming convention for all files added to subdirectories:
`[YYYYMMDD]_[Source]_[Identifier]_[Short_Title].[ext]`

*Example:* `20230512_OISD_STD_114_Hot_Work_Permit.pdf`

## Document Ingestion Workflow
When a new document is added to this directory, it must be ingested into the system to become searchable:
1. **Upload:** Place the legally obtained document into the appropriate subdirectory.
2. **Trigger Ingestion:** Call the backend API (`POST /api/v1/rag/ingest`) providing the file path.
3. **Processing (Backend):** The pipeline (`backend/src/services/rag/`) loads the document, splits it into semantically meaningful chunks, and extracts metadata.
4. **Embedding:** Chunks are passed through an embedding model (e.g., via Ollama).
5. **Storage:** The resulting vectors and text chunks are saved into the backend Vector Database (pgvector).

## How RAG Consumes Them
Once ingested, the documents power the AI Safety Copilot:
1. **Query:** A user asks the Copilot a safety-related question.
2. **Retrieval:** The RAG pipeline (`backend/src/routes/rag.py`) performs a semantic similarity search across the vector database to find the most relevant document chunks.
3. **Generation:** The retrieved chunks are injected into the context window of the local LLM.
4. **Response:** The LLM generates a precise answer and automatically cites the specific source document and page number from this corpus.
