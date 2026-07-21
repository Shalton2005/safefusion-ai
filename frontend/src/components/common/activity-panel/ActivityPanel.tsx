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
  const hasAnyActivity = alerts.length > 0 || incidents.length > 0 || workerActivity.length > 0 || permitActivity.length > 0;

  return (
    <div
      className={cn('overflow-y-auto px-4 py-4 space-y-6 w-full', className)}
      style={{ maxHeight }}
    >
      {!hasAnyActivity ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
          <AlertTriangle className="w-8 h-8 text-[var(--sf-text-tertiary)] mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-[var(--sf-text-secondary)]">No recent activity</h3>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-1">You're all caught up.</p>
        </div>
      ) : (
        <>
          {alerts.length > 0 && (
            <ActivityFeedSection
              title="Recent Alerts"
              icon={AlertTriangle}
              iconTone="danger"
              items={alerts}
              emptyLabel="No recent alerts"
            />
          )}

          {incidents.length > 0 && (
            <ActivityFeedSection
              title="Recent Incidents"
              icon={Flame}
              iconTone="warning"
              items={incidents}
              emptyLabel="No recent incidents"
            />
          )}

          {workerActivity.length > 0 && (
            <ActivityFeedSection
              title="Worker Activity"
              icon={HardHat}
              iconTone="primary"
              items={workerActivity}
              emptyLabel="No recent worker activity"
            />
          )}

          {permitActivity.length > 0 && (
            <ActivityFeedSection
              title="Permit Activity"
              icon={FileCheck2}
              iconTone="success"
              items={permitActivity}
              emptyLabel="No recent permit activity"
            />
          )}
        </>
      )}
    </div>
  );
}
