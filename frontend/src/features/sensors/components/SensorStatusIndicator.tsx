/**
 * SensorStatusIndicator
 *
 * Reusable, presentational row showing a single sensor's name, current
 * value, and colour-coded status. Purely props-driven — no data fetching —
 * so it can be reused in dashboards, tables, or detail panels alike.
 *
 * @example
 * <SensorStatusIndicator name="Gas – Zone A" value="12 ppm" status="normal" />
 */

import { Badge } from '@/components/ui';
import type { SensorStatus } from '@/types';

const statusVariant: Record<SensorStatus, 'success' | 'warning' | 'danger'> = {
  normal:   'success',
  warning:  'warning',
  critical: 'danger',
};

const statusLabel: Record<SensorStatus, string> = {
  normal:   'Normal',
  warning:  'Warning',
  critical: 'Critical',
};

export interface SensorStatusIndicatorProps {
  /** Human-readable sensor name (e.g. "Gas – Zone A"). */
  name: string;
  /** Current reading, pre-formatted with its unit (e.g. "12 ppm"). */
  value: string;
  /** Sensor health status — drives the colour-coded badge. */
  status: SensorStatus;
  className?: string;
}

export function SensorStatusIndicator({ name, value, status, className }: SensorStatusIndicatorProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] px-3 py-2.5 ${className ?? ''}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--sf-text-primary)] truncate">{name}</p>
        <p className="text-xs text-[var(--sf-text-tertiary)] font-mono">{value}</p>
      </div>
      <Badge variant={statusVariant[status]} size="sm" dot pulsing={status === 'critical'}>
        {statusLabel[status]}
      </Badge>
    </div>
  );
}
