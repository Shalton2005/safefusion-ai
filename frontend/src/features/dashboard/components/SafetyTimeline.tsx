/**
 * SafetyTimeline
 *
 * Reusable, presentational vertical timeline of chronological safety
 * events — sensor triggers, permit changes, worker movement, compound
 * risk assessments, dispatched emergency actions, and issued
 * recommendations. Purely props-driven — no data fetching, no charts —
 * so it can be reused in dashboards, audit views, or detail panels.
 * Pair with `SafetyTimelineSection` for the fetching wrapper.
 *
 * Severity is colour-coded via the shared `SEVERITY_BADGE_VARIANT` map.
 *
 * @example
 * <SafetyTimeline
 *   events={[
 *     { id: '1', type: 'sensor_threshold_crossed', label: 'Sensor Threshold Crossed', description: 'Gas concentration exceeds safe threshold.', severity: 'critical', timestamp: '2026-07-10T10:15:00Z', zone: 'Distillation-Unit' },
 *   ]}
 * />
 */

import { Radio, FileWarning, HardHat, Gauge, Siren, ClipboardList } from 'lucide-react';
import type { ElementType } from 'react';
import { Badge } from '@/components/ui';
import { capitalise, formatRelativeTime, formatDateTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { cn } from '@/lib/cn';
import type { SafetyTimelineEvent, SafetyTimelineEventType } from '@/types';

const EVENT_ICON: Record<SafetyTimelineEventType, ElementType> = {
  sensor_threshold_crossed: Radio,
  permit_expired: FileWarning,
  worker_entered_zone: HardHat,
  compound_risk_generated: Gauge,
  emergency_action_dispatched: Siren,
  recommendation_issued: ClipboardList,
};

const EVENT_ICON_VARIANT_BY_SEVERITY: Record<SafetyTimelineEvent['severity'], string> = {
  low:      'bg-safe-500/15    text-safe-500',
  medium:   'bg-primary-600/15 text-primary-400',
  high:     'bg-caution-500/15 text-caution-500',
  critical: 'bg-danger-500/15  text-danger-500',
};

export interface SafetyTimelineProps {
  /** Chronological events, newest first. */
  events: SafetyTimelineEvent[];
  className?: string;
}

export function SafetyTimeline({ events, className }: SafetyTimelineProps) {
  return (
    <ol className={cn('relative flex flex-col gap-6', className)}>
      {events.map((event, index) => {
        const Icon = EVENT_ICON[event.type];
        const isLast = index === events.length - 1;

        return (
          <li key={event.id} className="relative flex gap-3.5">
            {/* Marker + connecting line */}
            <div className="relative flex flex-col items-center flex-shrink-0">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
                  EVENT_ICON_VARIANT_BY_SEVERITY[event.severity],
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              {!isLast && (
                <div className="w-px flex-1 mt-1 bg-[var(--sf-border-default)]" aria-hidden="true" />
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1 pb-1 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-[var(--sf-text-primary)] leading-snug">
                  {event.label}
                </p>
                <Badge variant={SEVERITY_BADGE_VARIANT[event.severity]} size="sm" dot pulsing={event.severity === 'critical'}>
                  {capitalise(event.severity)}
                </Badge>
              </div>

              <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed whitespace-pre-line">
                {event.description}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--sf-text-tertiary)]">
                <span className="truncate">{event.zone}</span>
                <span title={formatDateTime(event.timestamp)}>
                  {event.isTimeApproximate ? 'As of ' : ''}
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
