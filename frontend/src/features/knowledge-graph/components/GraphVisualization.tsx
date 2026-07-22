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

function applyConcentricLayout(nodes: GraphNode[]): GraphNode[] {
  const cloned = nodes.map(n => ({ ...n }));

  const ring0: GraphNode[] = []; // incident, risk
  const ring1: GraphNode[] = []; // zone
  const ring2: GraphNode[] = []; // worker, permit, equipment
  const ring3: GraphNode[] = []; // sensor, camera

  cloned.forEach(node => {
    switch (node.kind) {
      case 'incident':
      case 'risk':
        ring0.push(node);
        break;
      case 'zone':
        ring1.push(node);
        break;
      case 'worker':
      case 'permit':
      case 'equipment':
        ring2.push(node);
        break;
      case 'sensor':
      case 'camera':
      default:
        ring3.push(node);
        break;
    }
  });

  let currentRadius = 0;

  const distribute = (ringNodes: GraphNode[], minGap: number) => {
    const total = ringNodes.length;
    if (total === 0) return;
    
    // Ensure circumference is large enough for all nodes to fit side by side (approx 140px width + 30px gap)
    const requiredCircumference = total * 170;
    const requiredRadius = requiredCircumference / (2 * Math.PI);
    
    currentRadius = Math.max(currentRadius + minGap, requiredRadius);
    
    // For single center nodes, keep them explicitly at center
    if (total === 1 && currentRadius < 10) currentRadius = 0;

    const angleStep = (2 * Math.PI) / total;
    ringNodes.forEach((node, i) => {
      node.position = {
        x: currentRadius * Math.cos(i * angleStep),
        y: currentRadius * Math.sin(i * angleStep)
      };
    });
  };

  distribute(ring0, 0); 
  distribute(ring1, 200); // Tighter gaps between rings
  distribute(ring2, 200);
  distribute(ring3, 200);

  return cloned;
}

const GRID_COLUMNS = 4;
const GRID_SPACING_X = 220;
const GRID_SPACING_Y = 140;

function toFlowNode(node: GraphNode, index: number, selectedNodeId?: string | null): Node {
  const kind = node.kind ?? 'default';
  const position = node.position ?? {
    x: (index % GRID_COLUMNS) * GRID_SPACING_X,
    y: Math.floor(index / GRID_COLUMNS) * GRID_SPACING_Y,
  };

  return {
    id: node.id,
    position,
    data: { label: node.label },
    selected: node.id === selectedNodeId,
    style: {
      borderRadius: 9999,
      border: `2px solid ${kindColorMap[kind]}`,
      background: 'var(--sf-surface-card)',
      color: 'var(--sf-text-primary)',
      fontSize: 10,
      fontWeight: 500,
      padding: '4px 8px',
      width: 140,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      textAlign: 'center',
    } satisfies CSSProperties,
  };
}

function toFlowEdge(edge: GraphEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.animated ?? false,
    style: { stroke: 'var(--sf-text-secondary)', strokeWidth: 2, opacity: 0.9 },
    labelStyle: { fill: 'var(--sf-text-primary)', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: 'var(--sf-surface-hover)', padding: [4, 6], borderRadius: 4 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: 'var(--sf-text-secondary)',
    },
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
    const layoutedNodes = applyConcentricLayout(nodes);
    return layoutedNodes.map((node, index) => toFlowNode(node, index, selectedNodeId));
  }, [nodes, selectedNodeId]);
  const flowEdges = useMemo(() => edges.map(toFlowEdge), [edges]);

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
