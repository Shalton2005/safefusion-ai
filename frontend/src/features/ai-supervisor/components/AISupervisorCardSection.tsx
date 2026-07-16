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
      <LastUpdated timestamp={snapshot.lastDecisionTime} className="px-1" />
    </div>
  );
}
