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

import { useEffect, useState } from 'react';
import { History, RotateCw } from 'lucide-react';
import { Card, CardHeader, Alert, Button, EmptyState, Skeleton } from '@/components/ui';
import { safetyTimelineService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import { cn } from '@/lib/cn';
import type { SafetyTimelineEvent } from '@/types';
import { SafetyTimeline } from './SafetyTimeline';

export interface SafetyTimelineSectionProps {
  /** Maximum number of recent events to display. @default 20 */
  limit?: number;
  className?: string;
}

export function SafetyTimelineSection({ limit = 20, className }: SafetyTimelineSectionProps) {
  const [events, setEvents] = useState<SafetyTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await safetyTimelineService.getTimeline({ limit }, { signal });
      setEvents(data);
    } catch (err) {
      const apiError = ApiError.from(err);
      if (!apiError.isCancelledError) {
        setError(apiError.toUserMessage());
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const { controller, signal } = createRequestController();
    fetchTimeline(signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

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
              <Button size="sm" variant="outline" onClick={() => fetchTimeline()} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className={cn('flex flex-col gap-6')}>
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
