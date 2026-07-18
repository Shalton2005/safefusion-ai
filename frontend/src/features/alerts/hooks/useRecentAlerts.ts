/**
 * useRecentAlerts
 *
 * Fetches `GET /alerts` exactly once per interval and shares the result —
 * so `AlertsPanel` and anything else needing the same alert feed can
 * consume one fetch instead of each firing its own request against the
 * same endpoint.
 *
 * @example
 * const { alerts, loading, error, refresh } = useRecentAlerts({ limit: 100 });
 */

import { useRef, useState } from 'react';
import { alertsService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { AlertRecord } from '@/types';

export interface UseRecentAlertsOptions {
  /** Maximum number of alert records to fetch. @default 100 */
  limit?: number;
}

export interface UseRecentAlertsResult {
  alerts: AlertRecord[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useRecentAlerts({ limit = 100 }: UseRecentAlertsOptions = {}): UseRecentAlertsResult {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchAlerts = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await alertsService.getRecentAlerts({ skip: 0, limit }, { signal });
      setAlerts(data);
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

  const { lastUpdated, refresh } = usePolling(fetchAlerts, DASHBOARD_REFRESH_INTERVAL);

  return { alerts, loading, error, lastUpdated, refresh };
}
