/**
 * AiTimelineSection
 *
 * Data-fetching wrapper around `CvTimeline`. Shows skeleton
 * placeholders while loading, a retryable error alert on failure, and
 * an empty state when there are no recent CV events.
 */

import { History, RotateCw } from 'lucide-react';
import { Alert, Button, Card, CardHeader, EmptyState, Skeleton } from '@/components/ui';
import { useCvTimeline } from '../hooks';
import { CvTimeline } from './CvTimeline';

export interface AiTimelineSectionProps {
  zone?: string;
}

export function AiTimelineSection({ zone }: AiTimelineSectionProps) {
  const { events, loading, error, refetch } = useCvTimeline(zone);

  return (
    <Card padding="none">
      <CardHeader
        title="AI Timeline"
        description="Chronological feed of hazard detections, PPE violations, zone intrusions, and camera status changes."
        className="px-6 pt-5 pb-0"
      />
      <div className="p-4">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load AI timeline"
            actions={
              <Button size="sm" variant="outline" onClick={refetch} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
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
            title="No recent AI events"
            description="No computer-vision events have been recorded recently."
          />
        ) : (
          <CvTimeline events={events} />
        )}
      </div>
    </Card>
  );
}
