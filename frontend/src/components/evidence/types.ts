/**
 * EvidenceViewer types
 *
 * `EvidenceViewer` displays only backend data — every field below
 * mirrors a real API response shape, nothing is computed or generated
 * client-side. Sensor/Permit/Worker evidence reuse the app's existing
 * domain types (`@/types`) directly, since those already match their
 * backend responses exactly; Graph Relationships and Retrieved
 * Documents get their own minimal shapes here since neither has an
 * existing reusable type at this component's level of generality.
 */

import type { Permit, SensorReading, Worker } from '@/types';

/** One knowledge-graph relationship cited as evidence. */
export interface EvidenceGraphRelationship {
  id: string;
  /** Relationship type as returned by the graph API, e.g. "LOCATED_IN". */
  type: string;
  /** Source node's display name (not its internal id). */
  sourceLabel: string;
  /** Source node's label/type, e.g. "Worker", "Zone". */
  sourceType: string;
  /** Target node's display name. */
  targetLabel: string;
  /** Target node's label/type. */
  targetType: string;
}

/** One document retrieved as supporting evidence (e.g. a RAG chunk). */
export interface EvidenceDocument {
  id: string;
  /** Source document name, e.g. "OISD-STD-118". */
  source: string;
  title: string | null;
  excerpt: string;
  /** Cosine similarity, 0-1. `null` when the backend doesn't rank results. */
  similarity: number | null;
}

/** Full payload for `EvidenceViewer` — every array is exactly what its backend endpoint returned. */
export interface EvidenceViewerData {
  sensorEvidence: SensorReading[];
  permitEvidence: Permit[];
  workerEvidence: Worker[];
  graphRelationships: EvidenceGraphRelationship[];
  retrievedDocuments: EvidenceDocument[];
}
