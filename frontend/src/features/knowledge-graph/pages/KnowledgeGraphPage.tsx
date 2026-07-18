import { useEffect, useMemo, useRef, useState } from 'react';
import { Waypoints } from 'lucide-react';
import { PageHeader, Badge, EmptyState, Loader, QueryState } from '@/components/ui';
import { GraphControls } from '@/features/knowledge-graph/components/GraphControls';
import {
  GraphVisualization,
  type GraphVisualizationHandle,
} from '@/features/knowledge-graph/components/GraphVisualization';
import { GraphDetailsPanel } from '@/features/knowledge-graph/components/GraphDetailsPanel';
import { GraphLegend } from '@/features/knowledge-graph/components/GraphLegend';
import { useKnowledgeGraph } from '@/features/knowledge-graph/hooks/useKnowledgeGraph';
import { useGraphSelectionStore } from '@/features/knowledge-graph/store/useGraphSelectionStore';
import { adaptGraphNode, adaptGraphEdge } from '@/features/knowledge-graph/utils/adaptGraphData';
import type { KnowledgeGraphNode } from '@/types';

export function KnowledgeGraphPage() {
  const { nodes, relationships, metadata, loading, error, refresh } = useKnowledgeGraph();
  const selectedNode = useGraphSelectionStore((s) => s.selectedNode);
  const select = useGraphSelectionStore((s) => s.select);
  const publishGraph = useGraphSelectionStore((s) => s.publishGraph);
  const graphRef = useRef<GraphVisualizationHandle>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    publishGraph({ nodes, relationships });
  }, [nodes, relationships, publishGraph]);

  const graphNodes = useMemo(() => nodes.map(adaptGraphNode), [nodes]);
  const graphEdges = useMemo(() => relationships.map(adaptGraphEdge), [relationships]);

  const visibleNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return graphNodes;
    return graphNodes.filter((node) => node.label.toLowerCase().includes(query));
  }, [graphNodes, search]);

  const visibleEdges = useMemo(() => {
    if (visibleNodes.length === graphNodes.length) return graphEdges;
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    return graphEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  }, [graphEdges, graphNodes.length, visibleNodes]);

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
      <GraphControls
        searchValue={search}
        onSearchChange={setSearch}
        onZoomIn={() => graphRef.current?.zoomIn()}
        onZoomOut={() => graphRef.current?.zoomOut()}
        onResetView={() => graphRef.current?.resetView()}
      />

      {/* Graph + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-4 items-start">
        {/* Graph visualization area */}
        <div className="h-[28rem] lg:h-[36rem] rounded-xl border border-[var(--sf-border-default)] bg-[var(--sf-surface-sunken)] overflow-hidden">
          <QueryState<KnowledgeGraphNode[]>
            loading={loading}
            error={error}
            data={nodes}
            onRetry={refresh}
            errorTitle="Failed to load knowledge graph"
            isEmpty={(d) => d.length === 0}
            emptyState={
              <div className="w-full h-full flex items-center justify-center">
                <EmptyState
                  icon={Waypoints}
                  title="No graph data"
                  description="No nodes or relationships have been ingested into the knowledge graph yet."
                />
              </div>
            }
            loadingFallback={
              <div className="w-full h-full flex items-center justify-center">
                <Loader size="lg" label="Loading knowledge graph…" />
              </div>
            }
          >
            {() => (
              <GraphVisualization
                ref={graphRef}
                className="h-full border-0 rounded-none"
                nodes={visibleNodes}
                edges={visibleEdges}
                selectedNodeId={selectedNode?.id ?? null}
                onNodeSelect={select}
              />
            )}
          </QueryState>
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
