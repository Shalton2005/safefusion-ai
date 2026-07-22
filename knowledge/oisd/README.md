# OISD (Oil Industry Safety Directorate)

Placeholder directory for OISD standards and guidelines.

*(Note: No documents have been added to this directory yet.)*

## Purpose
This directory supplies the RAG pipeline with rigorous standards specific to the oil and gas industry. The AI Copilot references these documents to validate safety protocols regarding petroleum storage, hot work permits, and fire protection systems in hydrocarbon processing facilities.

## Supported Documents
- `.pdf`, `.txt`, `.md`, `.docx`

## Naming Convention
`[YYYYMM]_OISD_STD_[Number]_[Title].[ext]`
*Example:* `202107_OISD_STD_114_Safe_Handling_of_Hazardous_Chemicals.pdf`

## Document Ingestion Workflow
1. Obtain licensed/official copies of OISD standards.
2. Place the file in this directory.
3. Trigger the `POST /api/v1/rag/ingest` endpoint to parse the technical documents, generate semantic embeddings via the AI service, and store them securely in the Vector Database.

## How RAG Consumes Them
During a high-risk operation like a confined space entry in a refinery, a user can query the AI Copilot for checklist requirements. The RAG engine semantically matches the query against the ingested OISD standards, retrieves the exact mandatory safety procedures, and presents them with a citation to the specific OISD standard number.
