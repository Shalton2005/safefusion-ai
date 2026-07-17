/**
 * useDetectionSummary
 *
 * Fetches the plant-wide (or zone-scoped) detection rollup backing the
 * Detection Summary section's stat cards.
 */

import { useCallback, useEffect, useState } from 'react';
import { detectionService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { DetectionSummary } from '../types';

export interface UseDetectionSummaryResult {
  summary: DetectionSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDetectionSummary(zone?: string): UseDetectionSummaryResult {
  const [summary, setSummary] = useState<DetectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    detectionService
      .getSummary(zone ? { zone } : undefined, { signal })
      .then(({ data }) => setSummary(data))
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
    fetchSummary(signal);
    return () => controller.abort();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: () => fetchSummary() };
}
