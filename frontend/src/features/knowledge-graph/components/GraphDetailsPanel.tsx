/**
 * GraphDetailsPanel
 *
 * Shows metadata for the currently selected node. Renders an empty
 * state when nothing is selected.
 */

import { MousePointerClick } from 'lucide-react';
import { Card, CardHeader, EmptyState, Badge } from '@/components/ui';
import type { GraphNode } from '@/features/knowledge-graph/components/GraphVisualization';

export interface GraphDetailsPanelProps {
  selectedNode?: GraphNode | null;
}

export function GraphDetailsPanel({ selectedNode }: GraphDetailsPanelProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader title="Details" description="Select a node to inspect it." />
      {selectedNode ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-[var(--sf-text-primary)]">
              {selectedNode.label}
            </h4>
            {selectedNode.kind && (
              <Badge variant="secondary" size="sm">{selectedNode.kind}</Badge>
            )}
          </div>
          {selectedNode.data && Object.keys(selectedNode.data).length > 0 && (
            <dl className="flex flex-col gap-1.5">
              {Object.entries(selectedNode.data).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-2 text-sm">
                  <dt className="text-[var(--sf-text-tertiary)]">{key}</dt>
                  <dd className="text-[var(--sf-text-secondary)] truncate">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center">
          <EmptyState
            size="sm"
            icon={MousePointerClick}
            title="Nothing selected"
            description="Click a node in the graph to view its details here."
          />
        </div>
      )}
    </Card>
  );
}
