/**
 * useGraphSelectionStore
 *
 * Currently-selected knowledge-graph node. Shared UI state between
 * GraphVisualization (sets it on node/pane click) and GraphDetailsPanel
 * (reads it to render details) — kept in Zustand rather than page-level
 * useState so either component can be composed independently without
 * KnowledgeGraphPage having to thread the prop through.
 */

import { create } from 'zustand';
import type { GraphNode } from '@/features/knowledge-graph/components/GraphVisualization';

interface GraphSelectionState {
  selectedNode: GraphNode | null;
  select: (node: GraphNode | null) => void;
  clear: () => void;
}

export const useGraphSelectionStore = create<GraphSelectionState>()((set) => ({
  selectedNode: null,
  select: (node) => set({ selectedNode: node }),
  clear: () => set({ selectedNode: null }),
}));
