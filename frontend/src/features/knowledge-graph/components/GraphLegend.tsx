/**
 * GraphLegend
 *
 * Static key describing node/edge color coding. Values are placeholders
 * until the graph taxonomy is finalized alongside the rendering engine.
 */

import { Card, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';

interface LegendEntry {
  label: string;
  swatchClassName: string;
}

const nodeTypes: LegendEntry[] = [
  { label: 'Worker',   swatchClassName: 'bg-primary-500' },
  { label: 'Sensor',   swatchClassName: 'bg-sky-500' },
  { label: 'Zone',     swatchClassName: 'bg-safe-500' },
  { label: 'Permit',   swatchClassName: 'bg-amber-500' },
  { label: 'Incident', swatchClassName: 'bg-danger-500' },
];

const edgeTypes: LegendEntry[] = [
  { label: 'Assigned to',  swatchClassName: 'bg-[var(--sf-text-tertiary)]' },
  { label: 'Located in',   swatchClassName: 'bg-[var(--sf-text-tertiary)]' },
  { label: 'Flagged by',   swatchClassName: 'bg-danger-400' },
];

function LegendRow({ label, swatchClassName }: LegendEntry) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', swatchClassName)} aria-hidden="true" />
      <span className="text-sm text-[var(--sf-text-secondary)]">{label}</span>
    </div>
  );
}

export function GraphLegend() {
  return (
    <Card>
      <CardHeader title="Legend" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--sf-text-tertiary)] uppercase tracking-wide">
            Node types
          </p>
          <div className="flex flex-col gap-1.5">
            {nodeTypes.map((entry) => (
              <LegendRow key={entry.label} {...entry} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--sf-text-tertiary)] uppercase tracking-wide">
            Relationship types
          </p>
          <div className="flex flex-col gap-1.5">
            {edgeTypes.map((entry) => (
              <LegendRow key={entry.label} {...entry} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
