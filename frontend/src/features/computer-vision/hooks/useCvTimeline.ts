/**
 * useCvTimeline
 *
 * Fetches the chronological feed of computer-vision events backing the
 * AI Timeline section.
 */

import { useCallback, useEffect, useState } from 'react';
import { detectionService } from '@/services';
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
    detectionService
      .getTimeline(zone ? { zone } : undefined, { signal })
      .then(({ data }) => setEvents(data))
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
