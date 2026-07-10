/**
 * PlantSafetyOverviewSection
 *
 * Data-fetching wrapper around `PlantSafetyOverview`. Polls the
 * dashboard aggregation endpoint, showing skeleton `StatCard`s while
 * loading and a retryable error alert on failure.
 *
 * @example
 * <PlantSafetyOverviewSection />
 */

import { useRef, useState } from 'react';
import { RotateCw, HardHat, Radio, FileCheck2, Bell, Gauge } from 'lucide-react';
import { Alert, Button, StatCard } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { dashboardService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { cn } from '@/lib/cn';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { PlantSafetyOverview as PlantSafetyOverviewData } from '@/types';
import { PlantSafetyOverview } from './PlantSafetyOverview';

export interface PlantSafetyOverviewSectionProps {
  className?: string;
}

const SKELETON_CARDS = [
  { label: 'Total Workers', icon: HardHat },
  { label: 'Active Sensors', icon: Radio },
  { label: 'Active Permits', icon: FileCheck2 },
  { label: 'Open Alerts', icon: Bell },
  { label: 'Current Risk Level', icon: Gauge },
];

export function PlantSafetyOverviewSection({ className }: PlantSafetyOverviewSectionProps) {
  const [overview, setOverview] = useState<PlantSafetyOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchOverview = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getPlantSafetyOverview({ signal });
      setOverview(data);
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

  const { lastUpdated, refresh } = usePolling(fetchOverview, DASHBOARD_REFRESH_INTERVAL);

  if (error) {
    return (
      <Alert
        variant="danger"
        title="Failed to load plant safety overview"
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

  if (loading || !overview) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4', className)}>
        {SKELETON_CARDS.map(({ label, icon }) => (
          <StatCard key={label} label={label} value="" icon={icon} loading />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <PlantSafetyOverview
        totalWorkers={overview.total_workers}
        activeSensors={overview.active_sensors}
        activePermits={overview.active_permits}
        openAlerts={overview.open_alerts}
        riskLevel={overview.risk_level}
      />
      <LastUpdated timestamp={lastUpdated} className="px-1" />
    </div>
  );
}
