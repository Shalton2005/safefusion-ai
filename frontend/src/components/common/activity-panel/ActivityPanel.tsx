/**
 * ActivityPanel
 *
 * Reusable, scrollable feed of Recent Alerts, Recent Incidents, Worker
 * Activity, and Permit Activity. Self-contained — drop it in a sidebar,
 * a drawer, or a dashboard column. Data is passed in per section so the
 * same component can be reused with different feeds; falls back to
 * bundled dummy data when no props are given.
 *
 * @example
 * // Default dummy data
 * <ActivityPanel />
 *
 * // Custom data / subset of sections
 * <ActivityPanel alerts={liveAlerts} incidents={[]} />
 */

import { AlertTriangle, Flame, HardHat, FileCheck2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ActivityFeedSection } from './ActivityFeedSection';
import type { ActivityFeedItem } from './types';

export interface ActivityPanelProps {
  alerts?: ActivityFeedItem[];
  incidents?: ActivityFeedItem[];
  workerActivity?: ActivityFeedItem[];
  permitActivity?: ActivityFeedItem[];
  /** Max height of the scroll area. Pass 'none' to let the parent control height. @default '100%' */
  maxHeight?: string;
  className?: string;
}

export function ActivityPanel({
  alerts = [],
  incidents = [],
  workerActivity = [],
  permitActivity = [],
  maxHeight = '100%',
  className,
}: ActivityPanelProps) {
  return (
    <div
      className={cn('overflow-y-auto px-4 py-4 space-y-6 w-full', className)}
      style={{ maxHeight }}
    >
      <ActivityFeedSection
        title="Recent Alerts"
        icon={AlertTriangle}
        iconTone="danger"
        items={alerts}
        emptyLabel="No recent alerts"
      />

      <ActivityFeedSection
        title="Recent Incidents"
        icon={Flame}
        iconTone="warning"
        items={incidents}
        emptyLabel="No recent incidents"
      />

      <ActivityFeedSection
        title="Worker Activity"
        icon={HardHat}
        iconTone="primary"
        items={workerActivity}
        emptyLabel="No recent worker activity"
      />

      <ActivityFeedSection
        title="Permit Activity"
        icon={FileCheck2}
        iconTone="success"
        items={permitActivity}
        emptyLabel="No recent permit activity"
      />
    </div>
  );
}
