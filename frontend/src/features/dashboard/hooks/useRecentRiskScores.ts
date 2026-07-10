/**
 * useRecentRiskScores
 *
 * Fetches `GET /risk-scores` (persisted records) exactly once per
 * mount/limit-change. Shared by `SafetyTimelineSection` and
 * `DashboardPage` so both can merge risk-score history into the safety
 * timeline without duplicating the fetch.
 *
 * @example
 * const { riskScores, loading, error, refresh } = useRecentRiskScores({ limit: 20 });
 */

import { useEffect, useState } from 'react';
import { compoundRiskService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { RiskScoreRecord } from '@/types';

export interface UseRecentRiskScoresOptions {
  /** Maximum number of persisted risk score records to fetch. @default 20 */
  limit?: number;
}

export interface UseRecentRiskScoresResult {
  riskScores: RiskScoreRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRecentRiskScores({ limit = 20 }: UseRecentRiskScoresOptions = {}): UseRecentRiskScoresResult {
  const [riskScores, setRiskScores] = useState<RiskScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const { controller, signal } = createRequestController();

    const fetchRiskScores = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await compoundRiskService.getRecent({ skip: 0, limit }, { signal });
        setRiskScores(data);
      } catch (err) {
        const apiError = ApiError.from(err);
        if (!apiError.isCancelledError) {
          setError(apiError.toUserMessage());
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchRiskScores();
    return () => controller.abort();
  }, [limit, refreshToken]);

  const refresh = () => setRefreshToken((t) => t + 1);

  return { riskScores, loading, error, refresh };
}
