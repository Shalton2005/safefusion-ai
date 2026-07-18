/**
 * useZoneOverview
 *
 * Polls `GET /dashboard/zones`. Extracted from `ZoneOverviewSection` so
 * the section can offer a prop-driven `View` alongside its self-fetching
 * default, matching `SafetyTimelineSection`/`AlertsPanel`'s split.
 *
 * @example
 * const { zones, loading, error, lastUpdated, refresh } = useZoneOverview();
 */

import { useRef, useState } from 'react';
import { dashboardService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { ZoneOverview } from '@/types';

export interface UseZoneOverviewResult {
  zones: ZoneOverview[] | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useZoneOverview(): UseZoneOverviewResult {
  const [zones, setZones] = useState<ZoneOverview[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchZones = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await dashboardService.getZoneOverview({ signal });
      setZones(data.data.zones);
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

  const { lastUpdated, refresh } = usePolling(fetchZones, DASHBOARD_REFRESH_INTERVAL);

  return { zones, loading, error, lastUpdated, refresh };
}
