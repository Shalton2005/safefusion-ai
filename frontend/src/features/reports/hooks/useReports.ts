/**
 * useReports
 *
 * Fetches the full aggregated report history (incidents, risk scores,
 * compliance evaluations, permits) once per polling interval. Search,
 * filtering, and pagination are handled client-side by `ReportsPage` —
 * this hook only owns the fetch, matching `useRecentAlerts`.
 *
 * @example
 * const { reports, loading, error, refresh } = useReports();
 */

import { useRef, useState } from 'react';
import { reportsService } from '@/services/reports.service';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { Report } from '@/types';

export interface UseReportsResult {
  reports: Report[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useReports(): UseReportsResult {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchReports = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const data = await reportsService.getReports({ signal });
      setReports(data);
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

  const { lastUpdated, refresh } = usePolling(fetchReports, DASHBOARD_REFRESH_INTERVAL);

  return { reports, loading, error, lastUpdated, refresh };
}
