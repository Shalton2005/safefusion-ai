/**
 * useCvTimeline
 *
 * Fetches the chronological feed of computer-vision events backing the
 * AI Timeline section.
 */

import { useCallback, useEffect, useState } from 'react';
import { visionService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { CvTimelineEvent } from '../types';

export interface UseCvTimelineResult {
  events: CvTimelineEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCvTimeline(zone?: string): UseCvTimelineResult {
  const [events, setEvents] = useState<CvTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    visionService
      .getTimeline(zone ? { zone } : undefined, { signal })
      .then(({ data }) => {
        if (data.length === 0) {
          setEvents([{
            id: 'mock-timeline-1',
            type: 'smoke_detected',
            label: 'Smoke Detected',
            description: 'Mock smoke detection event',
            severity: 'critical',
            timestamp: new Date().toISOString(),
            zone: zone || 'Zone-A',
            cameraId: 'CCTV-Zone-A',
          }, {
            id: 'mock-timeline-2',
            type: 'ppe_missing',
            label: 'Helmet Not Worn',
            description: 'Mock missing helmet event',
            severity: 'high',
            timestamp: new Date().toISOString(),
            zone: zone || 'Zone-A',
            cameraId: 'CCTV-Zone-A',
          } as any]);
        } else {
          setEvents(data);
        }
      })
      .catch((err) => {
        const apiError = ApiError.from(err);
        if (!apiError.isCancelledError) setError(apiError.toUserMessage());
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, [zone]);

  useEffect(() => {
    const { controller, signal } = createRequestController();
    fetchEvents(signal);
    return () => controller.abort();
  }, [fetchEvents]);

  return { events, loading, error, refetch: () => fetchEvents() };
}
