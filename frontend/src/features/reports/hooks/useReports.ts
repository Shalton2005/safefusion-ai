/**
 * useReports
 *
 * Fetches reports list.
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

export interface UseReportsOptions {
  limit?: number;
  skip?: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseReportsResult {
  reports: Report[];
  total: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useReports({ limit = 50, skip = 0, search, sortField, sortOrder }: UseReportsOptions = {}): UseReportsResult {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchReports = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data, total: totalRecords } = await reportsService.getReports(
        { skip, limit, search, sortField, sortOrder, signal }
      );
      setReports(data);
      setTotal(totalRecords);
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

  return { reports, total, loading, error, lastUpdated, refresh };
}
