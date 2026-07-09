/**
 * AlertStatusIndicator
 *
 * Reusable, presentational card showing a single alert's severity,
 * message, timestamp, and source. Purely props-driven — no data
 * fetching — so it can be reused in dashboards, feeds, or detail views.
 *
 * Severity is colour-coded via the shared `SEVERITY_BADGE_VARIANT` map,
 * with a pulsing dot for `critical` alerts.
 *
 * @example
 * <AlertStatusIndicator
 *   severity="critical"
 *   message="Gas leak detected"
 *   timestamp="2026-07-09T10:15:00Z"
 *   source="Zone A – Floor 1"
 * />
 */

import { Badge } from '@/components/ui';
import { capitalise, formatRelativeTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { SeverityLevel } from '@/constants';

export interface AlertStatusIndicatorProps {
  /** Alert severity — drives the colour-coded badge. */
  severity: SeverityLevel;
  /** Human-readable alert message / description. */
  message: string;
  /** ISO timestamp the alert occurred. */
  timestamp: string;
  /** Origin of the alert (e.g. zone, device, or system). */
  source: string;
  className?: string;
}

export function AlertStatusIndicator({
  severity,
  message,
  timestamp,
  source,
  className,
}: AlertStatusIndicatorProps) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] p-3.5 ${className ?? ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--sf-text-primary)] min-w-0">{message}</p>
        <Badge variant={SEVERITY_BADGE_VARIANT[severity]} size="sm" dot pulsing={severity === 'critical'}>
          {capitalise(severity)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[var(--sf-text-tertiary)]">
        <span className="truncate">{source}</span>
        <span>{formatRelativeTime(timestamp)}</span>
      </div>
    </div>
  );
}
