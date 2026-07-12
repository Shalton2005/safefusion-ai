/**
 * GraphDetailsPanel
 *
 * Shows metadata for the currently selected node/edge. Renders an
 * empty state until selection is wired up to the visualization engine.
 */

import { MousePointerClick } from 'lucide-react';
import { Card, CardHeader, EmptyState } from '@/components/ui';

export function GraphDetailsPanel() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader title="Details" description="Select a node or relationship to inspect it." />
      <div className="flex-1 flex items-center">
        <EmptyState
          size="sm"
          icon={MousePointerClick}
          title="Nothing selected"
          description="Click a node or edge in the graph to view its details here."
        />
      </div>
    </Card>
  );
}
