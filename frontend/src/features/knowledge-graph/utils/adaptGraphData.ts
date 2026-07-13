/**
 * Adapts the backend's KnowledgeGraph* API shape to GraphVisualization's
 * GraphNode/GraphEdge props. Kept as the single place this mapping
 * happens so no page/component duplicates it.
 */

import type { KnowledgeGraphNode, KnowledgeGraphRelationship } from '@/types';
import type { GraphNode, GraphEdge, GraphNodeKind } from '@/features/knowledge-graph/components/GraphVisualization';

const LABEL_TO_KIND: Record<string, GraphNodeKind> = {
  Worker: 'worker',
  Sensor: 'sensor',
  Zone: 'zone',
  Permit: 'permit',
  Incident: 'incident',
};

/** Picks a human-readable label for a node from its properties, falling back to the graph label + id. */
function deriveNodeLabel(node: KnowledgeGraphNode): string {
  const name = node.properties.name ?? node.properties.title;
  if (typeof name === 'string' && name.length > 0) return name;
  return `${node.label} ${node.id}`;
}

export function adaptGraphNode(node: KnowledgeGraphNode): GraphNode {
  return {
    id: node.id,
    label: deriveNodeLabel(node),
    kind: LABEL_TO_KIND[node.label] ?? 'default',
    data: { type: node.label, ...node.properties },
  };
}

export function adaptGraphEdge(relationship: KnowledgeGraphRelationship): GraphEdge {
  return {
    id: relationship.id,
    source: relationship.source,
    target: relationship.target,
    label: relationship.type,
  };
}
