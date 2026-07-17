/**
 * usePpeCompliance
 *
 * Fetches the aggregated PPE compliance summary backing the PPE
 * Compliance section.
 */

import { useCallback, useEffect, useState } from 'react';
import { visionService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { PpeComplianceSummary } from '../types';

export interface UsePpeComplianceResult {
  summary: PpeComplianceSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePpeCompliance(zone?: string): UsePpeComplianceResult {
  const [summary, setSummary] = useState<PpeComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    visionService
      .getPpeComplianceSummary(zone ? { zone } : undefined, { signal })
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
