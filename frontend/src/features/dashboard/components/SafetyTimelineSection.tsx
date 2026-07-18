/**
 * SafetyTimelineSection
 *
 * Data-fetching wrapper around `SafetyTimeline`. Fetches the merged
 * safety event feed (alerts + compound risk assessments), showing
 * skeleton placeholders while loading, a retryable error alert on
 * failure, and an empty state when there are no recent events.
 *
 * @example
 * <SafetyTimelineSection />
 */

import { History } from 'lucide-react';
import { Card, CardHeader, EmptyState, QueryState, Skeleton } from '@/components/ui';
import type { SafetyTimelineEvent } from '@/types';
import { SafetyTimeline } from './SafetyTimeline';

export interface SafetyTimelineSectionViewProps {
  events: SafetyTimelineEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational safety-timeline card — accepts an already-merged event
 * feed so a parent that already fetched alert data elsewhere on the page
 * (e.g. via a shared `useRecentAlerts()` call) can pass it in instead of
 * this section refetching `GET /alerts` on its own.
 */
export function SafetyTimelineSectionView({ events, loading, error, refresh, className }: SafetyTimelineSectionViewProps) {
  return (
    <Card padding="none" className={className}>
      <CardHeader
        title="Safety Timeline"
        description="Chronological safety events — sensor triggers, permit changes, worker movement, compound risk, emergency response, and recommendations."
        className="px-6 pt-5 pb-0"
      />
      <div className="p-4">
        <QueryState
          loading={loading}
          error={error}
          data={events}
          onRetry={refresh}
          errorTitle="Failed to load safety timeline"
          isEmpty={(e) => e.length === 0}
          emptyState={
            <EmptyState
              icon={History}
              title="No recent events"
              description="No safety events have been recorded recently."
            />
          }
          loadingFallback={
            <div className="flex flex-col gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3.5">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          {(eventData) => <SafetyTimeline events={eventData} />}
        </QueryState>
      </div>
    </Card>
  );
}
