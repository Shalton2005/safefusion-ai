import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Alert, Button, Skeleton } from '@/components/ui';
import { monitoringService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { RiskSummary } from '@/types';
import { RiskScoreWidget } from './RiskScoreWidget';

export function OverallRiskScoreSection() {
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await monitoringService.getSummary({ signal });
      setSummary(data.data);
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

  useEffect(() => {
    const { controller, signal } = createRequestController();
    fetchSummary(signal);
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <Alert
        variant="danger"
        title="Failed to load risk score"
        actions={
          <Button size="sm" variant="outline" onClick={() => fetchSummary()} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
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

  return <RiskScoreWidget score={summary.score} level={summary.level} />;
}
