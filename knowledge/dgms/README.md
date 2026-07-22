# DGMS (Directorate General of Mines Safety)

Placeholder directory for DGMS circulars, regulations, and safety guidelines.

*(Note: No documents have been added to this directory yet.)*

## Purpose
This directory provides the RAG pipeline with strict mining safety regulations. The AI Copilot uses these documents to advise on compliance regarding ventilation, roof support, explosive handling, and heavy machinery operations specific to mining environments.

## Supported Documents
- `.pdf`, `.txt`, `.md`, `.docx`

## Naming Convention
`[YYYYMMDD]_DGMS_[Circular/Regulation_Number]_[Title].[ext]`
*Example:* `20200815_DGMS_Tech_Circular_04_Dump_Stability.pdf`

## Document Ingestion Workflow
1. Obtain official copies through official DGMS channels.
2. Place the file in this directory.
3. Trigger the `POST /api/v1/rag/ingest` endpoint to chunk and embed the file into the Vector Database via `backend/src/services/rag/`.

## How RAG Consumes Them
When a user asks the AI Copilot about mining compliance or pit safety, the RAG engine performs a vector search against the chunks generated from these DGMS documents. The LLM then formulates an answer based purely on these regulations, citing the specific circular number in its response.
