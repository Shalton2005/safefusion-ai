/**
 * WorkflowGraph
 *
 * Compact React Flow canvas visualising each supervised agent feeding
 * into the AI Supervisor synthesis node, coloured by live agent
 * status. Presentation-only — accepts the already-fetched agent list
 * as props, fetches nothing itself (mirrors the knowledge-graph
 * feature's `GraphVisualization`).
 *
 * Colors come from `utils/statusColor` — the same status→color source
 * `AIStatusBadge` and `ConfidenceGauge` use — so this graph can't drift
 * from what the rest of the feature renders for the same status.
 *
 * @example
 * <WorkflowGraph agents={snapshot.agents} processingState={snapshot.processingState} />
 */

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  Controls,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/cn';
import { AGENT_STATUS_COLOR, PROCESSING_STATE_COLOR } from '../utils/statusColor';
import type { AIAgentSummary, AISupervisorProcessingState } from '../types';

export interface WorkflowGraphProps {
  agents: AIAgentSummary[];
  processingState: AISupervisorProcessingState;
  className?: string;
}

const AGENT_SPACING_Y = 90;
const SUPERVISOR_X = 340;

function buildNodes(agents: AIAgentSummary[], processingState: AISupervisorProcessingState): Node[] {
  const agentNodes: Node[] = agents.map((agent, index) => ({
    id: agent.id,
    position: { x: 0, y: index * AGENT_SPACING_Y },
    data: { label: agent.label },
    style: {
      borderRadius: 9999,
      border: `2px solid ${AGENT_STATUS_COLOR[agent.status]}`,
      background: 'var(--sf-surface-card)',
      color: 'var(--sf-text-primary)',
      fontSize: 12,
      fontWeight: 500,
      padding: '8px 14px',
    },
  }));

  const supervisorNode: Node = {
    id: 'supervisor',
    position: { x: SUPERVISOR_X, y: ((agents.length - 1) * AGENT_SPACING_Y) / 2 },
    data: { label: 'AI Supervisor' },
    style: {
      borderRadius: 12,
      border: `2px solid ${PROCESSING_STATE_COLOR[processingState]}`,
      background: 'var(--sf-surface-card)',
      color: 'var(--sf-text-primary)',
      fontSize: 13,
      fontWeight: 700,
      padding: '10px 18px',
    },
  };

  return [...agentNodes, supervisorNode];
}

function buildEdges(agents: AIAgentSummary[]): Edge[] {
  return agents.map((agent) => ({
    id: `${agent.id}-supervisor`,
    source: agent.id,
    target: 'supervisor',
    animated: agent.status === 'completed' || agent.status === 'waiting' || agent.status === 'running',
    style: { stroke: AGENT_STATUS_COLOR[agent.status], strokeWidth: 1.5 },
  }));
}

export function WorkflowGraph({ agents, processingState, className }: WorkflowGraphProps) {
  const nodes = useMemo(() => buildNodes(agents, processingState), [agents, processingState]);
  const edges = useMemo(() => buildEdges(agents), [agents]);

  return (
    <div
      className={cn(
        'relative w-full h-72 sm:h-64 rounded-xl border border-[var(--sf-border-default)]',
        'bg-[var(--sf-surface-sunken)] overflow-hidden',
        className,
      )}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          panOnDrag
          zoomOnScroll={true}
          zoomOnPinch={true}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          minZoom={0.2}
          maxZoom={2.0}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
