import { useRef, useState } from 'react';
import { analyticsService } from '@/services/analytics.service';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { AnalyticsSummary, TimeSeriesPoint } from '@/types';
import type { AlertDistributionSlice } from '@/components/charts';

export interface UseAnalyticsSummaryResult {
  summary: AnalyticsSummary | null;
  incidentTrend: TimeSeriesPoint[];
  riskDistribution: AlertDistributionSlice[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useAnalyticsSummary(): UseAnalyticsSummaryResult {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [incidentTrend, setIncidentTrend] = useState<TimeSeriesPoint[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<AlertDistributionSlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchSummary = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const [summaryRes, trendRes, distRes] = await Promise.all([
        analyticsService.getSummary({ signal }),
        analyticsService.getIncidentTrend({ signal }),
        analyticsService.getRiskTrendByZone({ signal })
      ]);
      setSummary(summaryRes.data);
      setIncidentTrend(trendRes);
      setRiskDistribution(distRes);
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

  const { lastUpdated, refresh } = usePolling(fetchSummary, DASHBOARD_REFRESH_INTERVAL);

  return { summary, incidentTrend, riskDistribution, loading, error, lastUpdated, refresh };
}
