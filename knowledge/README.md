# Knowledge Corpus

Source documents for the SafeFusion AI Retrieval-Augmented Generation (RAG) pipeline. Files placed here are chunked and embedded by the ingestion pipeline (see [backend/src/services/rag/](../backend/src/services/rag/)) and become retrievable via the RAG API ([backend/src/routes/rag.py](../backend/src/routes/rag.py)).

## Structure

| Folder | Contents |
| --- | --- |
| [`factory-act/`](factory-act/) | Factory Act and related state Factory Rules |
| [`oisd/`](oisd/) | OISD (Oil Industry Safety Directorate) standards and guidelines |
| [`dgms/`](dgms/) | DGMS (Directorate General of Mines Safety) circulars and regulations |
| [`sop/`](sop/) | Site/organization Standard Operating Procedures |
| [`incident-reports/`](incident-reports/) | Historical incident/accident reports |

Each folder currently contains only a README placeholder — no regulatory or procedural content has been added yet. Folders are populated only with documents from legitimate, permitted sources; see each folder's README for source guidance specific to that category.

## Status

This is the initial scaffold. No source documents are present. Do not assume any regulatory content exists in this corpus until it has been explicitly added.

## Provenance tracking

When adding a document to any folder, record its provenance (source, identifier/edition, and retrieval date) either in a per-document sidecar note or in a shared log within that folder. This keeps the corpus auditable and makes it possible to verify a retrieved chunk traces back to a legitimate source.

## Adding documents

1. Confirm you have the legal right to use the document (official publication, license, or organizational ownership).
2. Place it in the matching category folder.
3. Record its provenance (see above).
4. Run the ingestion pipeline to chunk and embed it into the `document_embeddings` table (pgvector) for retrieval.

## Out of scope for this scaffold

This commit only creates the folder structure and documentation. It does not include any Factory Act, OISD, DGMS, or other regulatory text — that content must be sourced and added separately, with permission verified for each document.
