/**
 * AiTimelineSection
 *
 * Data-fetching wrapper around `CvTimeline`. Shows skeleton
 * placeholders while loading, a retryable error alert on failure, and
 * an empty state when there are no recent CV events.
 */

import { History } from 'lucide-react';
import { Card, CardHeader, EmptyState, QueryState, Skeleton } from '@/components/ui';
import { useCvTimeline } from '../hooks';
import { CvTimeline } from './CvTimeline';
import type { CvTimelineEvent } from '../types';

export interface AiTimelineSectionProps {
  zone?: string;
}

export function AiTimelineSection({ zone }: AiTimelineSectionProps) {
  const { events, loading, error, refetch } = useCvTimeline(zone);

  return (
    <Card padding="none">
      <CardHeader
        title="AI Timeline"
        description="Chronological feed of person, PPE, fire, smoke, and restricted-area detections across every camera."
        className="px-6 pt-5 pb-0"
      />
      <div className="p-4">
        <QueryState<CvTimelineEvent[]>
          loading={loading}
          error={error}
          data={events}
          onRetry={refetch}
          errorTitle="Failed to load AI timeline"
          isEmpty={(d) => d.length === 0}
          emptyState={
            <EmptyState
              icon={History}
              title="No recent AI events"
              description="No computer-vision events have been recorded recently."
            />
          }
          loadingFallback={
            <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading AI timeline">
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
          {(data) => <CvTimeline events={data} />}
        </QueryState>
      </div>
    </Card>
  );
}
