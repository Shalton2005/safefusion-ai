/**
 * useGraphSelectionStore
 *
 * Currently-selected knowledge-graph node, plus the full node/relationship
 * lists KnowledgeGraphPage fetched via useKnowledgeGraph. Shared UI state
 * between GraphVisualization (sets selection on node/pane click) and
 * GraphDetailsPanel (reads selection + looks up connected relationships)
 * — kept in Zustand rather than page-level useState + prop drilling so
 * either component can be composed independently.
 *
 * KnowledgeGraphPage publishes the fetched graph via `publishGraph()`
 * whenever useKnowledgeGraph's result changes; it never re-fetches here.
 */

import { create } from 'zustand';
import type { GraphNode } from '@/features/knowledge-graph/components/GraphVisualization';
import type { KnowledgeGraphNode, KnowledgeGraphRelationship } from '@/types';

interface GraphSelectionState {
  selectedNode: GraphNode | null;
  /** Raw nodes from the last successful useKnowledgeGraph fetch — needed to resolve neighbor labels for connected relationships. */
  nodes: KnowledgeGraphNode[];
  /** Raw relationships from the last successful useKnowledgeGraph fetch. */
  relationships: KnowledgeGraphRelationship[];

  select: (node: GraphNode | null) => void;
  clear: () => void;
  publishGraph: (data: { nodes: KnowledgeGraphNode[]; relationships: KnowledgeGraphRelationship[] }) => void;
}

export const useGraphSelectionStore = create<GraphSelectionState>()((set) => ({
  selectedNode: null,
  nodes: [],
  relationships: [],

  select: (node) => set({ selectedNode: node }),
  clear: () => set({ selectedNode: null }),
  publishGraph: ({ nodes, relationships }) => set({ nodes, relationships }),
}));
