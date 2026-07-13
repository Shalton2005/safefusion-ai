/**
 * GraphLegend
 *
 * Reusable key showing the color + icon used for each knowledge-graph
 * node type (Worker, Sensor, Zone, Permit, Equipment, Incident, Risk),
 * plus the relationship line styles. Sourced entirely from the shared
 * graphTaxonomy module — no color/icon values are duplicated here, so
 * it always matches what GraphVisualization actually renders.
 *
 * @example
 * <GraphLegend />
 */

import { Card, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import { GRAPH_TYPE_META, GRAPH_NODE_KINDS } from '@/features/knowledge-graph/utils/graphTaxonomy';

interface EdgeLegendEntry {
  label: string;
  swatchClassName: string;
}

const edgeTypes: EdgeLegendEntry[] = [
  { label: 'Assigned to',  swatchClassName: 'bg-[var(--sf-text-tertiary)]' },
  { label: 'Located in',   swatchClassName: 'bg-[var(--sf-text-tertiary)]' },
  { label: 'Flagged by',   swatchClassName: 'bg-danger-400' },
];

function NodeTypeRow({ kind }: { kind: (typeof GRAPH_NODE_KINDS)[number] }) {
  const { label, swatchClassName, icon: Icon } = GRAPH_TYPE_META[kind];

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
          swatchClassName,
        )}
        aria-hidden="true"
      >
        <Icon className="w-3 h-3 text-white" />
      </span>
      <span className="text-sm text-[var(--sf-text-secondary)]">{label}</span>
    </div>
  );
}

function EdgeTypeRow({ label, swatchClassName }: EdgeLegendEntry) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', swatchClassName)} aria-hidden="true" />
      <span className="text-sm text-[var(--sf-text-secondary)]">{label}</span>
    </div>
  );
}

export interface GraphLegendProps {
  className?: string;
}

export function GraphLegend({ className }: GraphLegendProps) {
  return (
    <Card className={className}>
      <CardHeader title="Legend" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--sf-text-tertiary)] uppercase tracking-wide">
            Node types
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {GRAPH_NODE_KINDS.map((kind) => (
              <NodeTypeRow key={kind} kind={kind} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--sf-text-tertiary)] uppercase tracking-wide">
            Relationship types
          </p>
          <div className="flex flex-col gap-1.5">
            {edgeTypes.map((entry) => (
              <EdgeTypeRow key={entry.label} {...entry} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
