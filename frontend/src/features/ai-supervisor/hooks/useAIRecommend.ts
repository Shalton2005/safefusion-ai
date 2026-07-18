/**
 * useAIRecommend
 *
 * Fetches AI-surfaced recommendations via `POST /ai/recommend` (through
 * `aiService.recommend`) for `AIRecommendationCardGrid`. That endpoint
 * doesn't exist on the backend yet, so this resolves to a real
 * `ApiError` today — surfaced through the normal `error` state, same as
 * any other failed request. No recommendations are generated here.
 *
 * @example
 * const { recommendations, loading, error, refresh } = useAIRecommend();
 */

import { useCallback, useState } from 'react';
import { aiService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { AIRecommendation } from '@/components/recommendations';

export interface UseAIRecommendResult {
  recommendations: AIRecommendation[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAIRecommend(zone?: string): UseAIRecommendResult {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await aiService.recommend({ text: 'recommend', params: { zone } }, { signal });
        const mapped: AIRecommendation[] = data.recommendations.map((r, i) => ({
          id: `rec-${i}`,
          title: 'Recommendation',
          description: r.text,
          priority: 'medium',
          affectedArea: r.zone ?? 'Plant-wide',
          confidence: 100,
          actionType: r.source_agent
        }));
        setRecommendations(mapped);
      } catch (err) {
        const apiError = ApiError.from(err);
        if (!apiError.isCancelledError) {
          setRecommendations([]);
          setError(apiError.toUserMessage());
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [zone],
  );

  const { refresh } = usePolling(fetchRecommendations, DASHBOARD_REFRESH_INTERVAL);

  return { recommendations, loading, error, refresh };
}
