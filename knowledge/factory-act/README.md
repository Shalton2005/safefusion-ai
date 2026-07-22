# Factory Act & State Rules

Placeholder directory for the Factories Act, 1948, and corresponding state-specific Factory Rules.

*(Note: No documents have been added to this directory yet.)*

## Purpose
This directory equips the RAG pipeline with the foundational legal framework governing occupational safety, health, and welfare of workers in factories. The AI Copilot uses this to ensure that answers regarding working hours, hazardous processes, and welfare facilities align with statutory law.

## Supported Documents
- `.pdf`, `.txt`, `.md`, `.docx`

## Naming Convention
`[YYYY]_Govt_[Act_or_Rule_Name]_[State_if_applicable].[ext]`
*Example:* `1948_Govt_The_Factories_Act_Central.pdf`

## Document Ingestion Workflow
1. Obtain legally permitted copies (e.g., from DGFASLI or State Labour Departments).
2. Place the file in this directory.
3. Trigger the `POST /api/v1/rag/ingest` endpoint. The backend pipeline parses the complex legal numbering, splits it into chunks, and stores the embeddings in the Vector Database.

## How RAG Consumes Them
If a user asks "What are the legal requirements for storing flammable solvents?", the RAG pipeline retrieves the relevant sections from the Factory Act documents. The LLM uses these chunks as a strict factual basis, ensuring its advice is legally sound and citing the exact Chapter and Section.
