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

import { Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { CardHeaderLink } from '@/components/common/CardHeaderLink';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/cn';
import { useAISupervisor } from '../hooks/useAISupervisor';
import { AISupervisorCard } from './AISupervisorCard';

export interface AISupervisorCardSectionProps {
  className?: string;
}

export function AISupervisorCardSection({ className }: AISupervisorCardSectionProps) {
  const { snapshot, loading } = useAISupervisor();

  if (loading && !snapshot.lastDecisionTime) {
    return <Skeleton className={cn('h-[12.5rem] rounded-xl', className)} />;
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <AISupervisorCard snapshot={snapshot} />
      <div className="flex items-center justify-between px-1">
        <LastUpdated timestamp={snapshot.lastDecisionTime} />
        <CardHeaderLink to={ROUTES.AI_SUPERVISOR} label="View AI Supervisor" />
      </div>
    </div>
  );
}
