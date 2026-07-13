/**
 * Single source of truth for knowledge-graph node-type presentation
 * (color + icon), keyed by the backend's Neo4j node label. Shared by
 * GraphVisualization (node fill), GraphLegend (key), and
 * RelationshipDetailsPanel (header icon) so all three stay in sync —
 * changing a type's color/icon here updates it everywhere.
 */

import {
  HardHat,
  Radio,
  MapPin,
  FileCheck2,
  Wrench,
  TriangleAlert,
  ShieldAlert,
  Circle,
  type LucideIcon,
} from 'lucide-react';

export type GraphNodeKind =
  | 'worker'
  | 'sensor'
  | 'zone'
  | 'permit'
  | 'equipment'
  | 'incident'
  | 'risk'
  | 'default';

export interface GraphTypeMeta {
  /** Display label, e.g. "Worker". */
  label: string;
  /** Backend Neo4j node label this maps from, e.g. "Worker". */
  graphLabel: string;
  kind: GraphNodeKind;
  /** Hex fill used for the React Flow node border/minimap dot. */
  color: string;
  /** Tailwind background class for legend swatches (kept in sync with `color`). */
  swatchClassName: string;
  icon: LucideIcon;
}

export const GRAPH_TYPE_META: Record<GraphNodeKind, GraphTypeMeta> = {
  worker: {
    label: 'Worker',
    graphLabel: 'Worker',
    kind: 'worker',
    color: '#3b82f6', // primary-500
    swatchClassName: 'bg-primary-500',
    icon: HardHat,
  },
  sensor: {
    label: 'Sensor',
    graphLabel: 'Sensor',
    kind: 'sensor',
    color: '#0ea5e9', // sky-500
    swatchClassName: 'bg-sky-500',
    icon: Radio,
  },
  zone: {
    label: 'Zone',
    graphLabel: 'Zone',
    kind: 'zone',
    color: '#22c55e', // safe-500
    swatchClassName: 'bg-safe-500',
    icon: MapPin,
  },
  permit: {
    label: 'Permit',
    graphLabel: 'Permit',
    kind: 'permit',
    color: '#f59e0b', // amber-500
    swatchClassName: 'bg-amber-500',
    icon: FileCheck2,
  },
  equipment: {
    label: 'Equipment',
    graphLabel: 'Equipment',
    kind: 'equipment',
    color: '#a855f7', // purple-500
    swatchClassName: 'bg-purple-500',
    icon: Wrench,
  },
  incident: {
    label: 'Incident',
    graphLabel: 'Incident',
    kind: 'incident',
    color: '#ef4444', // danger-500
    swatchClassName: 'bg-danger-500',
    icon: TriangleAlert,
  },
  risk: {
    label: 'Risk',
    graphLabel: 'Risk',
    kind: 'risk',
    color: '#ec4899', // pink-500
    swatchClassName: 'bg-pink-500',
    icon: ShieldAlert,
  },
  default: {
    label: 'Other',
    graphLabel: '',
    kind: 'default',
    color: '#64748b', // slate-500
    swatchClassName: 'bg-slate-500',
    icon: Circle,
  },
};

/** Node kinds shown in the legend, in display order (excludes the `default` fallback). */
export const GRAPH_NODE_KINDS: GraphNodeKind[] = [
  'worker',
  'sensor',
  'zone',
  'permit',
  'equipment',
  'incident',
  'risk',
];

const GRAPH_LABEL_TO_KIND: Record<string, GraphNodeKind> = Object.fromEntries(
  GRAPH_NODE_KINDS.map((kind) => [GRAPH_TYPE_META[kind].graphLabel, kind]),
);

/** Maps a backend Neo4j node label (e.g. "Worker") to its taxonomy kind, falling back to `'default'`. */
export function graphLabelToKind(graphLabel: string): GraphNodeKind {
  return GRAPH_LABEL_TO_KIND[graphLabel] ?? 'default';
}
