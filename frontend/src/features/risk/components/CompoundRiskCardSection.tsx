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

import { RotateCw } from 'lucide-react';
import { Alert, Button, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { useCompoundRiskEngine } from '@/features/risk/hooks/useCompoundRiskEngine';
import { cn } from '@/lib/cn';
import type { CompoundRiskAssessment } from '@/types';
import { CompoundRiskCard } from './CompoundRiskCard';

export interface CompoundRiskCardSectionViewProps {
  assessment: CompoundRiskAssessment | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational compound-risk card — accepts an already-fetched
 * assessment so a parent (e.g. `DashboardPage` via a shared
 * `useCompoundRiskEngine()` call) can avoid running the compound risk
 * engine twice in parallel (once here, once for `RiskExplanationPanel`).
 */
export function CompoundRiskCardSectionView({ assessment, loading, error, lastUpdated, refresh, className }: CompoundRiskCardSectionViewProps) {
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

export interface CompoundRiskCardSectionProps {
  className?: string;
}

/** Standalone, self-fetching `CompoundRiskCardSection` — runs its own engine call. Use `CompoundRiskCardSectionView` instead when the result is already fetched elsewhere on the page. */
export function CompoundRiskCardSection({ className }: CompoundRiskCardSectionProps) {
  const { assessment, loading, error, lastUpdated, refresh } = useCompoundRiskEngine();
  return (
    <CompoundRiskCardSectionView
      assessment={assessment}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      refresh={refresh}
      className={className}
    />
  );
}
