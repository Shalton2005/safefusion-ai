/**
 * GraphDetailsPanel
 *
 * Store-connected wrapper around RelationshipDetailsPanel — reads the
 * selected node and the last-fetched graph (published by
 * KnowledgeGraphPage) from useGraphSelectionStore so callers don't
 * have to thread props through. Use RelationshipDetailsPanel directly
 * for standalone/reusable usage with explicit props.
 */

import { RelationshipDetailsPanel } from '@/features/knowledge-graph/components/RelationshipDetailsPanel';
import { useGraphSelectionStore } from '@/features/knowledge-graph/store/useGraphSelectionStore';

export function GraphDetailsPanel() {
  const selectedNode = useGraphSelectionStore((s) => s.selectedNode);
  const nodes = useGraphSelectionStore((s) => s.nodes);
  const relationships = useGraphSelectionStore((s) => s.relationships);

  return (
    <RelationshipDetailsPanel
      className="flex flex-col h-full"
      node={selectedNode}
      nodes={nodes}
      relationships={relationships}
    />
  );
}
