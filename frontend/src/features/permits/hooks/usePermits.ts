import { useState, useRef, useCallback } from 'react';
import { permitsService } from '@/services/permits.service';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { Permit } from '@/types';

export function usePermits() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchPermits = useCallback(async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await permitsService.getPermits({ limit: 500 }, { signal });
      setPermits(data);
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
  }, []);

  const { lastUpdated, refresh } = usePolling(fetchPermits, DASHBOARD_REFRESH_INTERVAL);

  return { permits, loading, error, lastUpdated, refresh };
}
