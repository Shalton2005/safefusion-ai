/**
 * AISupervisorCardSection
 *
 * Data-fetching wrapper around `AISupervisorCard`. Composes the four
 * supervised engine hooks via `useAISupervisor`, showing a skeleton
 * while the first result is loading.
 *
 * @example
 * <AISupervisorCardSection />
 */

import { QueryState, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { CardHeaderLink } from '@/components/common/CardHeaderLink';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/cn';
import { useCompoundRiskEngine } from '@/features/risk/hooks/useCompoundRiskEngine';
import { useEmergencyResponse } from '@/features/emergency/hooks/useEmergencyResponse';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
import { useComplianceStatus } from '@/features/compliance/hooks/useComplianceStatus';
import { useAISupervisor } from '../hooks/useAISupervisor';
import { AISupervisorCard } from './AISupervisorCard';
import type { AISupervisorSnapshot } from '../types';

export interface AISupervisorCardSectionProps {
  className?: string;
}

export function AISupervisorCardSection({ className }: AISupervisorCardSectionProps) {
  const compoundRisk = useCompoundRiskEngine();
  const emergencyResponse = useEmergencyResponse();
  const recommendation = useRecommendations();
  const compliance = useComplianceStatus();
  const { snapshot, loading, error, refresh } = useAISupervisor({ compoundRisk, emergencyResponse, recommendation, compliance });

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
