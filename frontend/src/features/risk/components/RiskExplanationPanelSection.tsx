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

import { ShieldOff } from 'lucide-react';
import { EmptyState, QueryState, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
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
  return (
    <QueryState
      loading={loading}
      error={error}
      data={{ explanation }}
      onRetry={refresh}
      errorTitle="Failed to load risk explanation"
      className={className}
      isEmpty={(d) => d.explanation === null}
      emptyState={
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
      }
      loadingFallback={<Skeleton className={cn('h-[22rem] rounded-xl', className)} />}
    >
      {({ explanation: explanationData }) =>
        explanationData && (
          <div className={cn('flex flex-col gap-1.5', className)}>
            <RiskExplanationPanel
              zone={explanationData.zone}
              riskLevel={explanationData.risk_level}
              triggeredRules={explanationData.triggered_rules}
              explanation={explanationData.explanation}
              contributingFactors={explanationData.contributing_factors}
            />
            <LastUpdated timestamp={lastUpdated} className="px-1" />
          </div>
        )
      }
    </QueryState>
  );
}
