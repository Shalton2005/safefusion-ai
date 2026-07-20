import { useRef, useState } from 'react';
import { Skeleton, QueryState } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { dashboardService, compoundRiskService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { RiskSummary } from '@/types';
import type { SeverityLevel } from '@/constants';
import { SEVERITY_LEVELS } from '@/constants';
import { RiskScoreWidget, type RiskScoreTrend } from './RiskScoreWidget';

function toRiskLevel(level: string | null): SeverityLevel {
  return (SEVERITY_LEVELS as readonly string[]).includes(level ?? '')
    ? (level as SeverityLevel)
    : 'low';
}

/** Compares the two most recent persisted plant-wide readings (`GET /risk-scores`, ordered most-recent-first). `null` when there's no prior reading yet. */
function deriveTrend(current: number, previous: number | undefined): RiskScoreTrend | null {
  if (previous === undefined) return null;
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}

export function OverallRiskScoreSection() {
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [trend, setTrend] = useState<RiskScoreTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchSummary = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const [{ data: dashboardData }, { data: recentScores }] = await Promise.all([
        dashboardService.getSummary({ signal }),
        compoundRiskService.getRecent({ skip: 0, limit: 2 }, { signal }),
      ]);
      const score = dashboardData.data.overall_risk_score ?? 0;
      setSummary({
        score,
        level: toRiskLevel(dashboardData.data.overall_risk_level),
        trend: 'stable',
      });
      setTrend(deriveTrend(score, recentScores[1]?.risk_score));
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
          <RiskScoreWidget score={data.score} level={data.level} trend={trend} />
          <LastUpdated timestamp={lastUpdated} className="px-1" />
        </div>
      )}
    </QueryState>
  );
}
