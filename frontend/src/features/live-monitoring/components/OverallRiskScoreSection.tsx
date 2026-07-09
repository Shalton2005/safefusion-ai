import { useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Alert, Button, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { monitoringService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { RiskSummary } from '@/types';
import { RiskScoreWidget } from './RiskScoreWidget';

export function OverallRiskScoreSection() {
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchSummary = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await monitoringService.getSummary({ signal });
      setSummary(data.data);
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

  if (error) {
    return (
      <Alert
        variant="danger"
        title="Failed to load risk score"
        actions={
          <Button size="sm" variant="outline" onClick={refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (loading || !summary) {
    return <Skeleton className="h-[9.5rem] rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <RiskScoreWidget score={summary.score} level={summary.level} />
      <LastUpdated timestamp={lastUpdated} className="px-1" />
    </div>
  );
}
