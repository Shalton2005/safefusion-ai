/**
 * usePlantSafetyOverview
 *
 * Polls `GET /dashboard` and reduces it to the plant-wide safety
 * snapshot. Extracted from `PlantSafetyOverviewSection` so the section
 * can offer a prop-driven `View` alongside its self-fetching default,
 * matching `SafetyTimelineSection`/`AlertsPanel`'s split.
 *
 * @example
 * const { overview, loading, error, lastUpdated, refresh } = usePlantSafetyOverview();
 */

import { useRef, useState } from 'react';
import { dashboardService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { PlantSafetyOverview } from '@/types';

export interface UsePlantSafetyOverviewResult {
  overview: PlantSafetyOverview | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function usePlantSafetyOverview(): UsePlantSafetyOverviewResult {
  const [overview, setOverview] = useState<PlantSafetyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchOverview = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getPlantSafetyOverview({ signal });
      setOverview(data);
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

  const { lastUpdated, refresh } = usePolling(fetchOverview, DASHBOARD_REFRESH_INTERVAL);

  return { overview, loading, error, lastUpdated, refresh };
}
