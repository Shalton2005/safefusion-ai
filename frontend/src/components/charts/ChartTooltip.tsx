/**
 * ChartTooltip
 *
 * Enterprise-styled Recharts tooltip: surface-overlay card, hairline border,
 * a color swatch per series, and value in tabular figures. Pass directly as
 * `content={<ChartTooltip />}` to any Recharts chart.
 */

import type { TooltipContentProps } from 'recharts';

export interface ChartTooltipProps
  extends Partial<TooltipContentProps<number | string, string>> {
  /** Optional formatter for the value shown per row. */
  valueFormatter?: (value: number | string) => string;
  /** Optional formatter for the tooltip heading (usually the x-axis key). */
  labelFormatter?: (label: string) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-sf-lg"
      style={{
        background: 'var(--sf-surface-overlay)',
        borderColor: 'var(--sf-border-strong)',
      }}
    >
      {label !== undefined && (
        <p className="text-2xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--sf-text-tertiary)' }}>
          {labelFormatter ? labelFormatter(String(label)) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: entry.color }}
              aria-hidden="true"
            />
            <span style={{ color: 'var(--sf-text-secondary)' }}>{entry.name}</span>
            <span
              className="ml-auto font-semibold font-mono"
              style={{ color: 'var(--sf-text-primary)' }}
            >
              {valueFormatter ? valueFormatter(entry.value as number) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
