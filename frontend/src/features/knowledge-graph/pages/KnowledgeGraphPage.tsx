import { Waypoints } from 'lucide-react';
import { PageHeader, Badge } from '@/components/ui';
import { GraphControls } from '@/features/knowledge-graph/components/GraphControls';
import { GraphVisualization } from '@/features/knowledge-graph/components/GraphVisualization';
import { GraphDetailsPanel } from '@/features/knowledge-graph/components/GraphDetailsPanel';
import { GraphLegend } from '@/features/knowledge-graph/components/GraphLegend';

export function KnowledgeGraphPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Knowledge Graph"
        description="Explore relationships between workers, sensors, zones, permits, and incidents."
        border={false}
        className="px-0 pt-0"
        badge={<Badge variant="secondary" size="sm"><Waypoints className="w-3 h-3 mr-1" />Beta</Badge>}
      />

      {/* Controls */}
      <GraphControls />

      {/* Graph + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-4 items-start">
        {/* Graph visualization area */}
        <div className="min-h-[28rem] lg:min-h-[36rem]">
          <GraphVisualization className="h-full" />
        </div>

        {/* Details panel + legend */}
        <div className="flex flex-col gap-4">
          <GraphDetailsPanel />
          <GraphLegend />
        </div>
      </div>
    </div>
  );
}
