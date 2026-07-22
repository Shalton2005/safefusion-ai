# Standard Operating Procedures (SOPs)

Placeholder directory for site-specific Standard Operating Procedures.

*(Note: No documents have been added to this directory yet.)*

## Purpose
This directory feeds the RAG pipeline with the internal, day-to-day operational rules of the specific plant deploying SafeFusion AI. It allows the AI Copilot to understand the exact procedural workflows, emergency evacuation routes, and equipment lockdown steps unique to the facility.

## Supported Documents
- `.pdf`, `.txt`, `.md`, `.docx`

## Naming Convention
`[YYYYMMDD]_[Department]_SOP_[Version]_[Title].[ext]`
*Example:* `20231101_Maintenance_SOP_v2_Lockout_Tagout.pdf`

## Document Ingestion Workflow
1. Ensure the SOP is the most current, approved version.
2. Place the file in this directory.
3. Trigger the `POST /api/v1/rag/ingest` endpoint. The backend pipeline reads the procedural steps, splits the document into coherent chunks, and embeds them into the Vector Database for retrieval.

## How RAG Consumes Them
If the Emergency Response Engine detects a fire, a supervisor can ask the Copilot "What is the immediate shutdown procedure for the blast furnace?" The RAG pipeline retrieves the relevant chunks directly from the ingested internal SOPs, allowing the LLM to output the exact step-by-step instructions authored by the plant's own engineering team, complete with citations.
