/**
 * useComplianceStatus
 *
 * Polls the plant-wide compliance status (`GET /compliance/status`).
 *
 * @example
 * const { snapshot, loading, error, lastUpdated, refresh } = useComplianceStatus();
 */

import { useRef, useState } from 'react';
import { complianceService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { ComplianceStatusSnapshot } from '@/types';

export interface UseComplianceStatusResult {
  snapshot: ComplianceStatusSnapshot | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useComplianceStatus(): UseComplianceStatusResult {
  const [snapshot, setSnapshot] = useState<ComplianceStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchStatus = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const result = await complianceService.getStatus(undefined, { signal });
      setSnapshot(result);
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

  const { lastUpdated, refresh } = usePolling(fetchStatus, DASHBOARD_REFRESH_INTERVAL);

  return { snapshot, loading, error, lastUpdated, refresh };
}
