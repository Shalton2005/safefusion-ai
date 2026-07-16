/**
 * WorkflowGraph
 *
 * Compact React Flow canvas visualising each supervised agent feeding
 * into the AI Supervisor synthesis node, coloured by live agent
 * status. Presentation-only — accepts the already-fetched agent list
 * as props, fetches nothing itself (mirrors the knowledge-graph
 * feature's `GraphVisualization`).
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
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/cn';
import type { AIAgentStatus, AIAgentSummary, AISupervisorProcessingState } from '../types';

export interface WorkflowGraphProps {
  agents: AIAgentSummary[];
  processingState: AISupervisorProcessingState;
  className?: string;
}

const AGENT_STATUS_COLOR: Record<AIAgentStatus, string> = {
  completed: 'var(--sf-safe-500, #22c55e)',
  waiting: 'var(--sf-caution-500, #f59e0b)',
  running: 'var(--sf-primary-500, #3b82f6)',
  failed: 'var(--sf-danger-500, #ef4444)',
  idle: 'var(--sf-text-tertiary, #64748b)',
};

const PROCESSING_STATE_COLOR: Record<AISupervisorProcessingState, string> = {
  idle: '#22c55e',
  processing: '#3b82f6',
  action_required: '#ef4444',
  error: '#ef4444',
};

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
        'relative w-full h-64 rounded-xl border border-[var(--sf-border-default)]',
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
          zoomOnScroll={false}
          zoomOnPinch={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.5}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
