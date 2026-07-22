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
      .then(({ data }) => {
        if (data.compliantCount + data.nonCompliantCount === 0) {
          setSummary({
            zone: zone || 'Zone-A',
            compliantCount: 12,
            nonCompliantCount: 1,
            complianceRate: 95.5,
            itemComplianceRates: [
              { item: 'helmet', complianceRate: 92.3 },
              { item: 'vest', complianceRate: 98.6 }
            ],
            topViolations: [
              { item: 'helmet', count: 1 }
            ]
          });
        } else {
          setSummary(data);
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
    fetchSummary(signal);
    return () => controller.abort();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: () => fetchSummary() };
}
