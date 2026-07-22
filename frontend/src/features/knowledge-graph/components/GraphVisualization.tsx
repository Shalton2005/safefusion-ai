/**
 * GraphVisualization
 *
 * Reusable, presentation-only graph canvas built on React Flow.
 * Deliberately decoupled from KnowledgeGraphPage: it accepts nodes/edges
 * as props, fetches nothing itself, and reports selection via a callback
 * so callers own state and data-fetching.
 *
 * @example
 * <GraphVisualization
 *   nodes={[{ id: 'w1', label: 'Worker A', kind: 'worker' }]}
 *   edges={[{ id: 'e1', source: 'w1', target: 'z1', label: 'Located in' }]}
 *   onNodeSelect={(node) => setSelected(node)}
 * />
 */

import { forwardRef, useCallback, useImperativeHandle, useMemo, type CSSProperties } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
  type NodeMouseHandler,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/cn';
import { GRAPH_TYPE_META, type GraphNodeKind } from '@/features/knowledge-graph/utils/graphTaxonomy';
import * as d3 from 'd3-force';
import { CustomNode } from './CustomNode';

const nodeTypes = { custom: CustomNode };

// ─── Public domain types ──────────────────────────────────────────
// Kept independent of React Flow's own Node/Edge types so consumers
// don't need to depend on (or know about) the rendering library.

export type { GraphNodeKind };

export interface GraphNode {
  id: string;
  label: string;
  kind?: GraphNodeKind;
  /** Optional fixed position. When omitted, nodes are auto-laid-out in a grid. */
  position?: { x: number; y: number };
  /** Arbitrary metadata surfaced to onNodeSelect / details panels. */
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

/**
 * Imperative zoom/pan controls exposed via ref, so an external toolbar
 * (e.g. GraphControls) can drive the canvas without GraphVisualization
 * needing to know anything about the toolbar itself.
 */
export interface GraphVisualizationHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Resets pan/zoom back to fit all nodes in view. */
  resetView: () => void;
}

export interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Fired when a node is selected, or with `null` when selection is cleared. */
  onNodeSelect?: (node: GraphNode | null) => void;
  /** Currently selected node id (controlled selection highlight). */
  selectedNodeId?: string | null;
  /** Shows the pan-able minimap in the bottom-right corner. @default true */
  showMiniMap?: boolean;
  className?: string;
}

// ─── Node kind → colour mapping ───────────────────────────────────
// Sourced from the shared taxonomy so GraphLegend / RelationshipDetailsPanel
// and the graph canvas never fall out of sync.

const kindColorMap: Record<GraphNodeKind, string> = Object.fromEntries(
  Object.entries(GRAPH_TYPE_META).map(([kind, meta]) => [kind, meta.color]),
) as Record<GraphNodeKind, string>;

function applyForceLayout(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const d3Nodes = nodes.map(n => ({ ...n, id: n.id } as any));
  const d3Edges = edges.map(e => ({ source: e.source, target: e.target }));

  const simulation = d3.forceSimulation(d3Nodes)
    .force('link', d3.forceLink(d3Edges).id((d: any) => d.id).distance(90))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('collide', d3.forceCollide().radius(45))
    .force('center', d3.forceCenter(0, 0))
    .stop();

  for (let i = 0; i < 300; ++i) {
    simulation.tick();
  }

  return nodes.map((n, i) => ({
    ...n,
    position: {
      x: (d3Nodes[i].x || 0) - 28,
      y: (d3Nodes[i].y || 0) - 28,
    }
  }));
}

function toFlowNode(node: GraphNode, index: number, selectedNodeId?: string | null): Node {
  return {
    id: node.id,
    type: 'custom',
    position: node.position ?? { x: 0, y: 0 },
    data: { label: node.label, kind: node.kind },
    selected: node.id === selectedNodeId,
  };
}

function toFlowEdge(edge: GraphEdge, sourceNode?: GraphNode): Edge {
  const color = sourceNode ? kindColorMap[sourceNode.kind ?? 'default'] : 'var(--sf-border-strong)';
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label, // Optional, can be removed if too cluttered
    type: 'default', // Elegant bezier curve
    animated: edge.animated ?? false,
    style: { stroke: color, strokeWidth: 1.5, opacity: 0.5 },
    labelStyle: { fill: 'var(--sf-text-secondary)', fontSize: 9 },
    labelBgStyle: { fill: 'transparent' },
  };
}

// ─── Component ────────────────────────────────────────────────────

interface GraphVisualizationInnerProps extends GraphVisualizationProps {
  handleRef?: React.Ref<GraphVisualizationHandle>;
}

function GraphVisualizationInner({
  nodes,
  edges,
  onNodeSelect,
  selectedNodeId,
  showMiniMap = true,
  className,
  handleRef,
}: GraphVisualizationInnerProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  useImperativeHandle(handleRef, () => ({
    zoomIn: () => zoomIn({ duration: 200 }),
    zoomOut: () => zoomOut({ duration: 200 }),
    resetView: () => fitView({ duration: 300 }),
  }), [zoomIn, zoomOut, fitView]);

  const nodeLookup = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const flowNodes = useMemo(() => {
    const layoutedNodes = applyForceLayout(nodes, edges);
    return layoutedNodes.map((node, index) => toFlowNode(node, index, selectedNodeId));
  }, [nodes, edges, selectedNodeId]);
  const flowEdges = useMemo(() => edges.map(e => toFlowEdge(e, nodeLookup.get(e.source))), [edges, nodeLookup]);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, flowNode) => {
      const original = nodeLookup.get(flowNode.id) ?? null;
      onNodeSelect?.(original);
    },
    [nodeLookup, onNodeSelect],
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  return (
    <div
      className={cn(
        'relative w-full h-full min-h-[24rem]',
        'rounded-xl border border-[var(--sf-border-default)]',
        'bg-[var(--sf-surface-sunken)] overflow-hidden',
        className,
      )}
    >
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={flowNodes}
        edges={flowEdges}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        selectionOnDrag={false}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls 
          position="bottom-left" 
          className="overflow-hidden border border-[var(--sf-border-default)] rounded-md shadow-lg [&>button]:bg-[var(--sf-surface-card)] [&>button]:border-b [&>button]:border-[var(--sf-border-default)] [&>button>svg]:fill-[var(--sf-text-primary)] hover:[&>button]:bg-[var(--sf-surface-hover)]"
        />
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            bgColor="var(--sf-surface-raised)"
            maskColor="rgba(0, 0, 0, 0.4)"
            nodeColor={(node) => (node.style?.border as string)?.split(' ').pop() ?? '#64748b'}
          />
        )}
      </ReactFlow>
    </div>
  );
}

/**
 * Wraps GraphVisualizationInner in ReactFlowProvider so the component
 * is self-contained and can be dropped anywhere without callers having
 * to set up React Flow context themselves.
 *
 * Pass a ref to drive zoom/reset imperatively from an external toolbar
 * (see GraphVisualizationHandle) — e.g. from GraphControls.
 */
export const GraphVisualization = forwardRef<GraphVisualizationHandle, GraphVisualizationProps>(
  function GraphVisualization(props, ref) {
    return (
      <ReactFlowProvider>
        <GraphVisualizationInner {...props} handleRef={ref} />
      </ReactFlowProvider>
    );
  },
);
