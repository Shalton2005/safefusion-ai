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

import { useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Alert, Button, Card, Skeleton } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { dashboardService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { cn } from '@/lib/cn';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { ZoneOverview as ZoneOverviewData } from '@/types';
import { ZoneOverview } from './ZoneOverview';

export interface ZoneOverviewSectionProps {
  className?: string;
}

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

export function ZoneOverviewSection({ className }: ZoneOverviewSectionProps) {
  const [zones, setZones] = useState<ZoneOverviewData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchZones = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await dashboardService.getZoneOverview({ signal });
      setZones(data.data.zones);
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

  const { lastUpdated, refresh } = usePolling(fetchZones, DASHBOARD_REFRESH_INTERVAL);

  if (error) {
    return (
      <Alert
        variant="danger"
        title="Failed to load zone overview"
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

  if (loading || !zones) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
        {[0, 1, 2, 3].map((i) => (
          <ZoneCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ZoneOverview zones={zones} className={className} />
      <LastUpdated timestamp={lastUpdated} className="px-1" />
    </div>
  );
}
