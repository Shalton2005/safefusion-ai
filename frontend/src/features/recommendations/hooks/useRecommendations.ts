/**
 * useRecommendations
 *
 * Polls the Recommendation Engine (`GET /recommendations`) for the
 * priority-ordered list of operator recommendations.
 *
 * @example
 * const { recommendations, loading, error, lastUpdated, refresh } = useRecommendations();
 */

import { useRef, useState } from 'react';
import { recommendationService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { Recommendation } from '@/types';

export interface UseRecommendationsResult {
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useRecommendations(): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchRecommendations = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const result = await recommendationService.getRecommendations({ signal });
      setRecommendations(result.recommendations);
      hasLoadedOnce.current = true;
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

  const { lastUpdated, refresh } = usePolling(fetchRecommendations, DASHBOARD_REFRESH_INTERVAL);

  return { recommendations, loading, error, lastUpdated, refresh };
}
