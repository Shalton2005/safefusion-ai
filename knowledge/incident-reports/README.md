# Historical Incident Reports

Placeholder directory for historical incident, near-miss, and accident investigation reports.

*(Note: No documents have been added to this directory yet.)*

## Purpose
This directory allows the RAG pipeline to learn from past failures. By ingesting Root Cause Analysis (RCA) and incident investigation reports, the AI Copilot can identify historical patterns, correlate current sensor anomalies with past disasters, and provide context-rich preventative recommendations.

## Supported Documents
- `.pdf`, `.txt`, `.md`, `.docx`

## Naming Convention
`[YYYYMMDD]_[Site_Name]_Incident_[Type]_[Short_Description].[ext]`
*Example:* `20240115_Vizag_Steel_Incident_Explosion_Coke_Oven.pdf`

## Document Ingestion Workflow
1. Obtain and heavily anonymize/redact internal incident reports to remove personally identifiable information (PII).
2. Place the file in this directory.
3. Trigger the `POST /api/v1/rag/ingest` endpoint. The backend processes the unstructured reports, extracts the timeline of events, embeds the text, and stores it in the Vector Database.

## How RAG Consumes Them
When a user asks "Have we ever had a gas leak in Zone B before?", the RAG pipeline searches the vector database for similar incident reports. The LLM summarizes the historical findings, details the root causes identified in the past, and cites the specific incident report so supervisors can review the full historical context.
