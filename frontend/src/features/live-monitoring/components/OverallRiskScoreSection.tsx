import { useRef, useState } from 'react';
import { Skeleton, QueryState } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { dashboardService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { RiskSummary } from '@/types';
import type { SeverityLevel } from '@/constants';
import { SEVERITY_LEVELS } from '@/constants';
import { RiskScoreWidget } from './RiskScoreWidget';

function toRiskLevel(level: string | null): SeverityLevel {
  return (SEVERITY_LEVELS as readonly string[]).includes(level ?? '')
    ? (level as SeverityLevel)
    : 'low';
}

export function OverallRiskScoreSection() {
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchSummary = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await dashboardService.getSummary({ signal });
      setSummary({
        score: data.data.overall_risk_score ?? 0,
        level: toRiskLevel(data.data.overall_risk_level),
        trend: 'stable',
      });
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

  return (
    <QueryState
      loading={loading}
      error={error}
      data={summary}
      onRetry={refresh}
      errorTitle="Failed to load risk score"
      loadingFallback={<Skeleton className="h-[9.5rem] rounded-xl" />}
    >
      {(data) => (
        <div className="flex flex-col gap-1.5">
          <RiskScoreWidget score={data.score} level={data.level} />
          <LastUpdated timestamp={lastUpdated} className="px-1" />
        </div>
      )}
    </QueryState>
  );
}
