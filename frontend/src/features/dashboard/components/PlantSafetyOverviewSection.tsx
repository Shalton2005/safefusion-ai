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

import { HardHat, Radio, FileCheck2, Bell, Gauge, ShieldOff } from 'lucide-react';
import { EmptyState, QueryState, StatCard } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { usePlantSafetyOverview } from '@/features/dashboard/hooks/usePlantSafetyOverview';
import { cn } from '@/lib/cn';
import type { PlantSafetyOverview as PlantSafetyOverviewData } from '@/types';
import { PlantSafetyOverview } from './PlantSafetyOverview';

const SKELETON_CARDS = [
  { label: 'Total Workers', icon: HardHat },
  { label: 'Active Sensors', icon: Radio },
  { label: 'Active Permits', icon: FileCheck2 },
  { label: 'Open Alerts', icon: Bell },
  { label: 'Current Risk Level', icon: Gauge },
];

export interface PlantSafetyOverviewSectionViewProps {
  overview: PlantSafetyOverviewData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational plant-safety-overview card — accepts already-fetched
 * data so a parent (e.g. `DashboardPage` via a shared
 * `usePlantSafetyOverview()` call) can avoid refetching `GET /dashboard`
 * this section would otherwise call on its own. Use
 * `PlantSafetyOverviewSection` below for standalone, self-fetching usage.
 */
export function PlantSafetyOverviewSectionView({ overview, loading, error, lastUpdated, refresh, className }: PlantSafetyOverviewSectionViewProps) {
  return (
    <QueryState
      loading={loading}
      error={error}
      data={overview}
      onRetry={refresh}
      errorTitle="Failed to load plant safety overview"
      className={className}
      isEmpty={(o) => o.total_workers === 0 && o.active_sensors === 0 && o.active_permits === 0}
      emptyState={
        <EmptyState
          icon={ShieldOff}
          title="No plant data available"
          description="No workers, sensors, or permits are currently being tracked."
          className={className}
        />
      }
      loadingFallback={
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4', className)}>
          {SKELETON_CARDS.map(({ label, icon }) => (
            <StatCard key={label} label={label} value="" icon={icon} loading />
          ))}
        </div>
      }
    >
      {(overviewData) => (
        <div className={cn('flex flex-col gap-1.5', className)}>
          <PlantSafetyOverview
            totalWorkers={overviewData.total_workers}
            activeSensors={overviewData.active_sensors}
            activePermits={overviewData.active_permits}
            openAlerts={overviewData.open_alerts}
            riskLevel={overviewData.risk_level}
          />
          <LastUpdated timestamp={lastUpdated} className="px-1" />
        </div>
      )}
    </QueryState>
  );
}

export interface PlantSafetyOverviewSectionProps {
  className?: string;
}

/** Standalone, self-fetching `PlantSafetyOverviewSection` — polls `GET /dashboard` on its own. Use `PlantSafetyOverviewSectionView` instead when the data is already fetched elsewhere on the page. */
export function PlantSafetyOverviewSection({ className }: PlantSafetyOverviewSectionProps) {
  const { overview, loading, error, lastUpdated, refresh } = usePlantSafetyOverview();
  return (
    <PlantSafetyOverviewSectionView
      overview={overview}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      refresh={refresh}
      className={className}
    />
  );
}
