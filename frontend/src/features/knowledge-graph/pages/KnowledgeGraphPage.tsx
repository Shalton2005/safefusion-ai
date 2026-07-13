import { useMemo } from 'react';
import { Waypoints, RotateCw } from 'lucide-react';
import { PageHeader, Badge, Alert, Button, EmptyState, Loader } from '@/components/ui';
import { GraphControls } from '@/features/knowledge-graph/components/GraphControls';
import { GraphVisualization } from '@/features/knowledge-graph/components/GraphVisualization';
import { GraphDetailsPanel } from '@/features/knowledge-graph/components/GraphDetailsPanel';
import { GraphLegend } from '@/features/knowledge-graph/components/GraphLegend';
import { useKnowledgeGraph } from '@/features/knowledge-graph/hooks/useKnowledgeGraph';
import { useGraphSelectionStore } from '@/features/knowledge-graph/store/useGraphSelectionStore';
import { adaptGraphNode, adaptGraphEdge } from '@/features/knowledge-graph/utils/adaptGraphData';

export function KnowledgeGraphPage() {
  const { nodes, relationships, metadata, loading, error, refresh } = useKnowledgeGraph();
  const selectedNode = useGraphSelectionStore((s) => s.selectedNode);
  const select = useGraphSelectionStore((s) => s.select);

  const graphNodes = useMemo(() => nodes.map(adaptGraphNode), [nodes]);
  const graphEdges = useMemo(() => relationships.map(adaptGraphEdge), [relationships]);
  const isEmpty = !loading && !error && nodes.length === 0;

  return (
    <div className="page-container">
      <PageHeader
        title="Knowledge Graph"
        description="Explore relationships between workers, sensors, zones, permits, and incidents."
        border={false}
        className="px-0 pt-0"
        badge={
          <Badge variant="secondary" size="sm">
            <Waypoints className="w-3 h-3 mr-1" />
            {metadata ? `${metadata.node_count} nodes · ${metadata.relationship_count} relationships` : 'Beta'}
          </Badge>
        }
      />

      {/* Controls */}
      <GraphControls />

      {error && (
        <Alert
          variant="danger"
          title="Failed to load knowledge graph"
          actions={
            <Button size="sm" variant="outline" onClick={refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Graph + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-4 items-start">
        {/* Graph visualization area */}
        <div className="h-[28rem] lg:h-[36rem] rounded-xl border border-[var(--sf-border-default)] bg-[var(--sf-surface-sunken)] overflow-hidden">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader size="lg" label="Loading knowledge graph…" />
            </div>
          ) : isEmpty ? (
            <div className="w-full h-full flex items-center justify-center">
              <EmptyState
                icon={Waypoints}
                title="No graph data"
                description="No nodes or relationships have been ingested into the knowledge graph yet."
              />
            </div>
          ) : !error ? (
            <GraphVisualization
              className="h-full border-0 rounded-none"
              nodes={graphNodes}
              edges={graphEdges}
              selectedNodeId={selectedNode?.id ?? null}
              onNodeSelect={select}
            />
          ) : null}
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
