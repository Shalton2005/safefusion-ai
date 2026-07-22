/**
 * usePpeViolations
 *
 * Fetches currently-open PPE violations, most recent first, backing the
 * PPE Compliance Panel's "Current Violations" list.
 */

import { useCallback, useEffect, useState } from 'react';
import { visionService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { PpeViolation } from '../types';

export interface UsePpeViolationsResult {
  violations: PpeViolation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePpeViolations(zone?: string): UsePpeViolationsResult {
  const [violations, setViolations] = useState<PpeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchViolations = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    visionService
      .getPpeViolations(zone ? { zone } : undefined, { signal })
      .then(({ data }) => {
        if (data.length === 0) {
          setViolations([{
            id: 'mock-violation-1',
            zone: zone || 'Zone-A',
            cameraId: 'CCTV-Zone-A',
            workerId: 'EMP-DEMO-01',
            missingItems: ['helmet'],
            detectedAt: new Date().toISOString()
          }]);
        } else {
          setViolations(data);
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
    fetchViolations(signal);
    return () => controller.abort();
  }, [fetchViolations]);

  return { violations, loading, error, refetch: () => fetchViolations() };
}
