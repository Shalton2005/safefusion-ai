/**
 * useCompoundRiskEngine
 *
 * Polls the compound risk engine (`POST /risk-scores/calculate`) exactly
 * once per interval and derives both the `CompoundRiskAssessment` and
 * `RiskExplanation` shapes from the same response — so `CompoundRiskCard`
 * and `RiskExplanationPanel` can share a single fetch instead of each
 * polling the (non-idempotent) engine endpoint independently.
 *
 * @example
 * const { assessment, explanation, loading, error, lastUpdated, refresh } = useCompoundRiskEngine();
 */

import { useRef, useState } from 'react';
import { compoundRiskService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { CompoundRiskAssessment, RiskExplanation } from '@/types';

export interface UseCompoundRiskEngineResult {
  assessment: CompoundRiskAssessment | null;
  explanation: RiskExplanation | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useCompoundRiskEngine(): UseCompoundRiskEngineResult {
  const [assessment, setAssessment] = useState<CompoundRiskAssessment | null>(null);
  const [explanation, setExplanation] = useState<RiskExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchEngineResult = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const result = await compoundRiskService.calculate({ signal });
      setAssessment(compoundRiskService.toAssessment(result));
      setExplanation(compoundRiskService.toExplanation(result));
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

  const { lastUpdated, refresh } = usePolling(fetchEngineResult, DASHBOARD_REFRESH_INTERVAL);

  return { assessment, explanation, loading, error, lastUpdated, refresh };
}
