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

import { History, RotateCw } from 'lucide-react';
import { Card, CardHeader, Alert, Button, EmptyState, Skeleton } from '@/components/ui';
import { safetyTimelineService } from '@/services';
import { useRecentAlerts } from '@/features/alerts/hooks/useRecentAlerts';
import { useRecentRiskScores } from '@/features/dashboard/hooks/useRecentRiskScores';
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
        description="Chronological safety events across sensors, permits, workers, and risk assessments."
        className="px-6 pt-5 pb-0"
      />
      <div className="p-4">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load safety timeline"
            actions={
              <Button size="sm" variant="outline" onClick={refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading ? (
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
        ) : events.length === 0 ? (
          <EmptyState
            icon={History}
            title="No recent events"
            description="No safety events have been recorded recently."
          />
        ) : (
          <SafetyTimeline events={events} />
        )}
      </div>
    </Card>
  );
}

export interface SafetyTimelineSectionProps {
  /** Maximum number of recent events to display. @default 20 */
  limit?: number;
  className?: string;
}

/**
 * Standalone, self-fetching `SafetyTimelineSection`. Uses the shared
 * `useRecentAlerts()` hook (so it dedupes against any other consumer of
 * that same hook higher up the tree) plus its own `GET /risk-scores` call,
 * merging both into the event feed. Use `SafetyTimelineSectionView`
 * instead when a parent already holds both pieces of data.
 */
export function SafetyTimelineSection({ limit = 20, className }: SafetyTimelineSectionProps) {
  const { alerts, loading: alertsLoading, error: alertsError, refresh: refreshAlerts } = useRecentAlerts({ limit });
  const { riskScores, loading: riskScoresLoading, error: riskScoresError, refresh: refreshRiskScores } = useRecentRiskScores({ limit });

  const loading = alertsLoading || riskScoresLoading;
  const error = alertsError ?? riskScoresError;
  const events = safetyTimelineService.mergeTimeline(alerts, riskScores, limit);

  const refresh = () => {
    refreshAlerts();
    refreshRiskScores();
  };

  return (
    <SafetyTimelineSectionView
      events={events}
      loading={loading}
      error={error}
      refresh={refresh}
      className={className}
    />
  );
}
