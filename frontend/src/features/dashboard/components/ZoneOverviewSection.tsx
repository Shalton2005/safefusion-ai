/**
 * ZoneOverviewSection
 *
 * Data-fetching wrapper around `ZoneOverview`. Polls
 * `GET /dashboard/zones`, showing skeleton cards while loading and a
 * retryable error alert on failure.
 *
 * @example
 * <ZoneOverviewSection />
 */

import { MapPin } from 'lucide-react';
import { Card, EmptyState, QueryState, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { useZoneOverview } from '@/features/dashboard/hooks/useZoneOverview';
import { cn } from '@/lib/cn';
import type { ZoneOverview as ZoneOverviewData } from '@/types';
import { ZoneOverview } from './ZoneOverview';

function ZoneCardSkeleton() {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--sf-border-default)]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-5 w-8 rounded" />
            <Skeleton className="h-2.5 w-12 rounded" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export interface ZoneOverviewSectionViewProps {
  zones: ZoneOverviewData[] | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational zone-overview grid — accepts already-fetched data so a
 * parent (e.g. `DashboardPage` via a shared `useZoneOverview()` call)
 * can avoid refetching `GET /dashboard/zones` this section would
 * otherwise call on its own. Use `ZoneOverviewSection` below for
 * standalone, self-fetching usage.
 */
export function ZoneOverviewSectionView({ zones, loading, error, lastUpdated, refresh, className }: ZoneOverviewSectionViewProps) {
  return (
    <QueryState
      loading={loading}
      error={error}
      data={zones}
      onRetry={refresh}
      errorTitle="Failed to load zone overview"
      className={className}
      isEmpty={(z) => z.length === 0}
      emptyState={
        <EmptyState
          icon={MapPin}
          title="No zones configured"
          description="No plant zones are currently configured for monitoring."
          className={className}
        />
      }
      loadingFallback={
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
          {[0, 1, 2, 3].map((i) => (
            <ZoneCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      {(zoneData) => (
        <div className="flex flex-col gap-1.5">
          <ZoneOverview zones={zoneData} className={className} />
          <LastUpdated timestamp={lastUpdated} className="px-1" />
        </div>
      )}
    </QueryState>
  );
}

export interface ZoneOverviewSectionProps {
  className?: string;
}

/** Standalone, self-fetching `ZoneOverviewSection` — polls `GET /dashboard/zones` on its own. Use `ZoneOverviewSectionView` instead when the data is already fetched elsewhere on the page. */
export function ZoneOverviewSection({ className }: ZoneOverviewSectionProps) {
  const { zones, loading, error, lastUpdated, refresh } = useZoneOverview();
  return (
    <ZoneOverviewSectionView
      zones={zones}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      refresh={refresh}
      className={className}
    />
  );
}
