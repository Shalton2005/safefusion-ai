/**
 * CvTimeline
 *
 * Reusable, presentational vertical timeline of chronological
 * computer-vision events — hazard detections, PPE violations, zone
 * intrusions, and camera status changes. Purely props-driven, same
 * structure as the dashboard's `SafetyTimeline`. Pair with
 * `AiTimelineSection` for the fetching wrapper.
 */

import { AlertTriangle, Camera as CameraIcon, HardHat, LogIn } from 'lucide-react';
import type { ElementType } from 'react';
import { Badge } from '@/components/ui';
import { capitalise, formatRelativeTime, formatDateTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { cn } from '@/lib/cn';
import type { CvTimelineEvent, CvTimelineEventType } from '../types';

const EVENT_ICON: Record<CvTimelineEventType, ElementType> = {
  hazard_detected: AlertTriangle,
  ppe_violation: HardHat,
  zone_intrusion: LogIn,
  camera_status_changed: CameraIcon,
};

const EVENT_ICON_VARIANT_BY_SEVERITY: Record<CvTimelineEvent['severity'], string> = {
  low:      'bg-safe-500/15    text-safe-500',
  medium:   'bg-primary-600/15 text-primary-400',
  high:     'bg-caution-500/15 text-caution-500',
  critical: 'bg-danger-500/15  text-danger-500',
};

export interface CvTimelineProps {
  events: CvTimelineEvent[];
  className?: string;
}

export function CvTimeline({ events, className }: CvTimelineProps) {
  return (
    <ol className={cn('relative flex flex-col gap-6', className)}>
      {events.map((event, index) => {
        const Icon = EVENT_ICON[event.type];
        const isLast = index === events.length - 1;

        return (
          <li key={event.id} className="relative flex gap-3.5">
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

            <div className="flex flex-col gap-1 pb-1 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-[var(--sf-text-primary)] leading-snug">
                  {event.label}
                </p>
                <Badge variant={SEVERITY_BADGE_VARIANT[event.severity]} size="sm" dot pulsing={event.severity === 'critical'}>
                  {capitalise(event.severity)}
                </Badge>
              </div>

              <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">
                {event.description}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--sf-text-tertiary)]">
                <span className="truncate">{event.zone}</span>
                <span title={formatDateTime(event.timestamp)}>{formatRelativeTime(event.timestamp)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
