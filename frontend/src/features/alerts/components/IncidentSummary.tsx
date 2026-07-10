/**
 * IncidentSummary
 *
 * Reusable, presentational list of recent incidents (alerts) showing
 * severity, timestamp, and status for each. Purely props-driven — no
 * data fetching — so it can be reused in dashboards, feeds, or detail
 * views. Pair with `IncidentSummarySection` for the fetching wrapper.
 *
 * Severity and status are colour-coded via the shared
 * `SEVERITY_BADGE_VARIANT` / `ALERT_STATUS_BADGE_VARIANT` maps.
 *
 * @example
 * <IncidentSummary
 *   incidents={[
 *     { id: '1', message: 'Gas leak detected', severity: 'critical', status: 'active', timestamp: '2026-07-10T10:15:00Z', zone: 'Zone-A' },
 *   ]}
 * />
 */

import { Card, Badge } from '@/components/ui';
import { capitalise, formatRelativeTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT, ALERT_STATUS_BADGE_VARIANT } from '@/utils/severity';
import { cn } from '@/lib/cn';
import type { SeverityLevel, AlertStatus } from '@/constants';

export interface IncidentSummaryItem {
  id: string;
  /** Human-readable incident/alert message. */
  message: string;
  /** Drives the severity badge colour. */
  severity: SeverityLevel;
  /** Drives the status badge colour. */
  status: AlertStatus;
  /** ISO timestamp the incident occurred. */
  timestamp: string;
  /** Origin of the incident (e.g. zone, device, or system). */
  zone: string;
}

export interface IncidentSummaryProps {
  incidents: IncidentSummaryItem[];
  className?: string;
}

export function IncidentSummary({ incidents, className }: IncidentSummaryProps) {
  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {incidents.map((incident) => (
        <li key={incident.id}>
          <Card padding="sm" className="flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-[var(--sf-text-primary)] min-w-0">
                {incident.message}
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant={SEVERITY_BADGE_VARIANT[incident.severity]} size="sm" dot pulsing={incident.severity === 'critical'}>
                  {capitalise(incident.severity)}
                </Badge>
                <Badge variant={ALERT_STATUS_BADGE_VARIANT[incident.status]} size="sm">
                  {capitalise(incident.status)}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[var(--sf-text-tertiary)]">
              <span className="truncate">{incident.zone}</span>
              <span>{formatRelativeTime(incident.timestamp)}</span>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
