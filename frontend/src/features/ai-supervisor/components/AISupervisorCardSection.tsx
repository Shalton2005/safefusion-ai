/**
 * AISupervisorCardSection
 *
 * Presentational wrapper around `AISupervisorCard`, deriving a snapshot
 * via `useAISupervisor` from the four supervised engine hook results
 * passed in as `engines`, showing a skeleton while the first result is
 * loading.
 *
 * Takes `engines` rather than self-fetching so its one caller,
 * `DashboardPage`, can share the same polling instance of each engine
 * hook it already mounts for its own Compound Risk / Emergency
 * Response / Compliance / Recommendations sections — each `use*` hook
 * call is its own independent polling timer, so calling the same hook
 * twice on one page doubles that engine's network traffic.
 *
 * @example
 * <AISupervisorCardSection engines={{ compoundRisk, emergencyResponse, recommendation, compliance }} />
 */

import { QueryState, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { CardHeaderLink } from '@/components/common/CardHeaderLink';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/cn';
import { useAISupervisor, type UseAISupervisorParams } from '../hooks/useAISupervisor';
import { AISupervisorCard } from './AISupervisorCard';
import type { AISupervisorSnapshot } from '../types';

export interface AISupervisorCardSectionProps {
  className?: string;
  /** Already-fetched engine results to derive the snapshot from. */
  engines: UseAISupervisorParams;
}

export function AISupervisorCardSection({ className, engines }: AISupervisorCardSectionProps) {
  const { snapshot, loading, error, refresh } = useAISupervisor(engines);

  return (
    <QueryState<AISupervisorSnapshot>
      loading={loading}
      error={error}
      data={snapshot}
      onRetry={refresh}
      errorTitle="Failed to load AI Supervisor"
      className={className}
      loadingFallback={<Skeleton className={cn('h-[12.5rem] rounded-xl', className)} />}
    >
      {(snapshotData) => (
        <div className={cn('flex flex-col gap-1.5', className)}>
          <AISupervisorCard snapshot={snapshotData} />
          <div className="flex items-center justify-between px-1">
            <LastUpdated timestamp={snapshotData.lastDecisionTime} />
            <CardHeaderLink to={ROUTES.AI_SUPERVISOR} label="View AI Supervisor" />
          </div>
        </div>
      )}
    </QueryState>
  );
}
