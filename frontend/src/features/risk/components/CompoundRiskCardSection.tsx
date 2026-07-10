/**
 * CompoundRiskCardSection
 *
 * Data-fetching wrapper around `CompoundRiskCard`. Polls the compound
 * risk engine endpoint, showing a skeleton while loading and a
 * retryable error alert on failure.
 *
 * @example
 * <CompoundRiskCardSection />
 */

import { useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Alert, Button, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { compoundRiskService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { cn } from '@/lib/cn';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { CompoundRiskAssessment } from '@/types';
import { CompoundRiskCard } from './CompoundRiskCard';

export interface CompoundRiskCardSectionProps {
  className?: string;
}

export function CompoundRiskCardSection({ className }: CompoundRiskCardSectionProps) {
  const [assessment, setAssessment] = useState<CompoundRiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchAssessment = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const data = await compoundRiskService.getAssessment({ signal });
      setAssessment(data);
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

  const { lastUpdated, refresh } = usePolling(fetchAssessment, DASHBOARD_REFRESH_INTERVAL);

  if (error) {
    return (
      <Alert
        variant="danger"
        title="Failed to load compound risk"
        actions={
          <Button size="sm" variant="outline" onClick={refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        }
        className={className}
      >
        {error}
      </Alert>
    );
  }

  if (loading || !assessment) {
    return <Skeleton className={cn('h-[9.5rem] rounded-xl', className)} />;
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <CompoundRiskCard
        riskScore={assessment.risk_score}
        riskLevel={assessment.risk_level}
        triggeredRulesCount={assessment.triggered_rules_count}
        status={assessment.status}
      />
      <LastUpdated timestamp={lastUpdated} className="px-1" />
    </div>
  );
}
