/**
 * RiskExplanationPanelSection
 *
 * Data-fetching wrapper around `RiskExplanationPanel`. Polls the
 * compound risk engine endpoint, showing a skeleton while loading, a
 * retryable error alert on failure, and an empty state when the
 * engine reports no zones with risk signal.
 *
 * @example
 * <RiskExplanationPanelSection />
 */

import { useRef, useState } from 'react';
import { RotateCw, ShieldOff } from 'lucide-react';
import { Alert, Button, EmptyState, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { compoundRiskService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { cn } from '@/lib/cn';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { RiskExplanation } from '@/types';
import { RiskExplanationPanel } from './RiskExplanationPanel';

export interface RiskExplanationPanelSectionProps {
  className?: string;
}

export function RiskExplanationPanelSection({ className }: RiskExplanationPanelSectionProps) {
  const [explanation, setExplanation] = useState<RiskExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchExplanation = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const data = await compoundRiskService.getExplanation({ signal });
      setExplanation(data);
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

  const { lastUpdated, refresh } = usePolling(fetchExplanation, DASHBOARD_REFRESH_INTERVAL);

  if (error) {
    return (
      <Alert
        variant="danger"
        title="Failed to load risk explanation"
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

  if (loading) {
    return <Skeleton className={cn('h-[22rem] rounded-xl', className)} />;
  }

  if (!explanation) {
    return (
      <div
        className={cn(
          'rounded-xl border border-[var(--sf-border-default)] bg-[var(--sf-surface-card)]',
          className,
        )}
      >
        <EmptyState
          icon={ShieldOff}
          title="No risk explanation available"
          description="The risk engine has no zones with risk signal to explain right now."
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <RiskExplanationPanel
        zone={explanation.zone}
        riskLevel={explanation.risk_level}
        triggeredRules={explanation.triggered_rules}
        explanation={explanation.explanation}
        contributingFactors={explanation.contributing_factors}
      />
      <LastUpdated timestamp={lastUpdated} className="px-1" />
    </div>
  );
}
