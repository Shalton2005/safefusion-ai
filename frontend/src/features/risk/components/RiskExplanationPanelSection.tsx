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

import { ShieldOff, RotateCw } from 'lucide-react';
import { Alert, Button, EmptyState, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { useCompoundRiskEngine } from '@/features/risk/hooks/useCompoundRiskEngine';
import { cn } from '@/lib/cn';
import type { RiskExplanation } from '@/types';
import { RiskExplanationPanel } from './RiskExplanationPanel';

export interface RiskExplanationPanelSectionViewProps {
  explanation: RiskExplanation | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational risk-explanation panel — accepts an already-fetched
 * explanation so a parent (e.g. `DashboardPage` via a shared
 * `useCompoundRiskEngine()` call) can avoid running the compound risk
 * engine twice in parallel (once here, once for `CompoundRiskCard`).
 */
export function RiskExplanationPanelSectionView({ explanation, loading, error, lastUpdated, refresh, className }: RiskExplanationPanelSectionViewProps) {
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

export interface RiskExplanationPanelSectionProps {
  className?: string;
}

/** Standalone, self-fetching `RiskExplanationPanelSection` — runs its own engine call. Use `RiskExplanationPanelSectionView` instead when the result is already fetched elsewhere on the page. */
export function RiskExplanationPanelSection({ className }: RiskExplanationPanelSectionProps) {
  const { explanation, loading, error, lastUpdated, refresh } = useCompoundRiskEngine();
  return (
    <RiskExplanationPanelSectionView
      explanation={explanation}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      refresh={refresh}
      className={className}
    />
  );
}
