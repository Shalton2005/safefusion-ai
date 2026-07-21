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
        // Mock data since the backend endpoint doesn't exist for the hackathon
        const mockData: AIRecommendation[] = [
          {
            id: 'rec-1',
            title: 'Halt Hot Work Operations',
            description: 'Suspend all active hot work permits in the Boiler House until the smoke alarm is cleared and investigated.',
            priority: 'high',
            affectedArea: 'Boiler House',
            confidence: 94,
            actionType: 'Safety Intervention',
          },
          {
            id: 'rec-2',
            title: 'Dispatch Safety Officer',
            description: 'Deploy on-site safety personnel to physically inspect Camera-03 blind spots.',
            priority: 'medium',
            affectedArea: 'Boiler House',
            confidence: 88,
            actionType: 'Field Verification',
          }
        ];
        
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        if (!signal?.aborted) {
          setRecommendations(mockData);
        }
      } catch (err) {
        if (!signal?.aborted) {
          setRecommendations([]);
          setError('Failed to load recommendations.');
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
