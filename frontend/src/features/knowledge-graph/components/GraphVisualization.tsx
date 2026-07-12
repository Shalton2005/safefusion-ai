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

import { useCallback, useMemo, type CSSProperties } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/cn';

// ─── Public domain types ──────────────────────────────────────────
// Kept independent of React Flow's own Node/Edge types so consumers
// don't need to depend on (or know about) the rendering library.

export type GraphNodeKind =
  | 'worker'
  | 'sensor'
  | 'zone'
  | 'permit'
  | 'incident'
  | 'default';

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
// Mirrors GraphLegend's swatch colours so node fills stay in sync.

const kindColorMap: Record<GraphNodeKind, string> = {
  worker:   '#3b82f6', // primary-500
  sensor:   '#0ea5e9', // sky-500
  zone:     '#22c55e', // safe-500
  permit:   '#f59e0b', // amber-500
  incident: '#ef4444', // danger-500
  default:  '#64748b', // slate-500
};

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
      fontSize: 12,
      fontWeight: 500,
      padding: '8px 14px',
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
    style: { stroke: 'var(--sf-text-tertiary)', strokeWidth: 1.5 },
    labelStyle: { fill: 'var(--sf-text-secondary)', fontSize: 11 },
    labelBgStyle: { fill: 'var(--sf-surface-card)' },
  };
}

// ─── Component ────────────────────────────────────────────────────

function GraphVisualizationInner({
  nodes,
  edges,
  onNodeSelect,
  selectedNodeId,
  showMiniMap = true,
  className,
}: GraphVisualizationProps) {
  const nodeLookup = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const flowNodes = useMemo(
    () => nodes.map((node, index) => toFlowNode(node, index, selectedNodeId)),
    [nodes, selectedNodeId],
  );
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
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        selectionOnDrag={false}
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
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
 */
export function GraphVisualization(props: GraphVisualizationProps) {
  return (
    <ReactFlowProvider>
      <GraphVisualizationInner {...props} />
    </ReactFlowProvider>
  );
}
