/**
 * useHazardDetections
 *
 * Fetches recent hazard detections, most recent first, backing the
 * Hazard Detection section.
 */

import { useCallback, useEffect, useState } from 'react';
import { detectionService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { HazardDetection } from '../types';

export interface UseHazardDetectionsResult {
  hazards: HazardDetection[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHazardDetections(zone?: string): UseHazardDetectionsResult {
  const [hazards, setHazards] = useState<HazardDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHazards = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    detectionService
      .getHazards(zone ? { zone } : undefined, { signal })
      .then(({ data }) => setHazards(data))
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
    fetchHazards(signal);
    return () => controller.abort();
  }, [fetchHazards]);

  return { hazards, loading, error, refetch: () => fetchHazards() };
}
