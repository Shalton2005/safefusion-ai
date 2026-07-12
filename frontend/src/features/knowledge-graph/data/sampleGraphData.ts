/**
 * Placeholder graph data for KnowledgeGraphPage until a real
 * knowledge-graph API/service is wired up. GraphVisualization itself
 * never imports this — it only ever receives nodes/edges as props.
 */

import type { GraphNode, GraphEdge } from '@/features/knowledge-graph/components/GraphVisualization';

const nodes: GraphNode[] = [
  { id: 'worker-1', label: 'Worker A', kind: 'worker', data: { role: 'Electrician', shift: 'Day' } },
  { id: 'worker-2', label: 'Worker B', kind: 'worker', data: { role: 'Welder', shift: 'Night' } },
  { id: 'sensor-1', label: 'Sensor 01', kind: 'sensor', data: { type: 'Gas', status: 'Online' } },
  { id: 'zone-1', label: 'Zone A', kind: 'zone', data: { risk: 'Medium' } },
  { id: 'permit-1', label: 'Permit #4821', kind: 'permit', data: { status: 'Active' } },
  { id: 'incident-1', label: 'Incident #112', kind: 'incident', data: { severity: 'High' } },
];

const edges: GraphEdge[] = [
  { id: 'e1', source: 'worker-1', target: 'zone-1', label: 'Located in' },
  { id: 'e2', source: 'worker-2', target: 'zone-1', label: 'Located in' },
  { id: 'e3', source: 'sensor-1', target: 'zone-1', label: 'Monitors' },
  { id: 'e4', source: 'permit-1', target: 'zone-1', label: 'Issued for' },
  { id: 'e5', source: 'incident-1', target: 'worker-1', label: 'Flagged by', animated: true },
];

export const sampleGraphData = { nodes, edges };
