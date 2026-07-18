import { useState, useRef, useCallback } from 'react';
import { workersService } from '@/services/workers.service';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { Worker } from '@/types';

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchWorkers = useCallback(async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await workersService.getWorkers({ limit: 1000 }, { signal });
      setWorkers(data);
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

  const { lastUpdated, refresh } = usePolling(fetchWorkers, DASHBOARD_REFRESH_INTERVAL);

  return { workers, loading, error, lastUpdated, refresh };
}
