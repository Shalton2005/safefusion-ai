import { useState } from 'react';
import { Waypoints } from 'lucide-react';
import { PageHeader, Badge } from '@/components/ui';
import { GraphControls } from '@/features/knowledge-graph/components/GraphControls';
import {
  GraphVisualization,
  type GraphNode,
} from '@/features/knowledge-graph/components/GraphVisualization';
import { GraphDetailsPanel } from '@/features/knowledge-graph/components/GraphDetailsPanel';
import { GraphLegend } from '@/features/knowledge-graph/components/GraphLegend';
import { sampleGraphData } from '@/features/knowledge-graph/data/sampleGraphData';

export function KnowledgeGraphPage() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

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
        <div className="h-[28rem] lg:h-[36rem]">
          <GraphVisualization
            className="h-full"
            nodes={sampleGraphData.nodes}
            edges={sampleGraphData.edges}
            selectedNodeId={selectedNode?.id ?? null}
            onNodeSelect={setSelectedNode}
          />
        </div>

        {/* Details panel + legend */}
        <div className="flex flex-col gap-4">
          <GraphDetailsPanel selectedNode={selectedNode} />
          <GraphLegend />
        </div>
      </div>
    </div>
  );
}
