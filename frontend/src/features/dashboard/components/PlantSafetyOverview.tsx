/**
 * PlantSafetyOverview
 *
 * Reusable, presentational grid of the plant's top-line safety
 * metrics — Total Workers, Active Sensors, Active Permits, Open
 * Alerts, and Current Risk Level — built from `StatCard`. Purely
 * props-driven, no data fetching. Pair with
 * `PlantSafetyOverviewSection` for the fetching wrapper.
 *
 * @example
 * <PlantSafetyOverview
 *   totalWorkers={142}
 *   activeSensors={54}
 *   activePermits={18}
 *   openAlerts={3}
 *   riskLevel="medium"
 * />
 */

import { HardHat, Radio, FileCheck2, Bell, Gauge } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { SeverityLevel } from '@/constants';

export interface PlantSafetyOverviewProps {
  totalWorkers: number;
  /** Sensors currently reporting a reading across all zones. */
  activeSensors: number;
  activePermits: number;
  openAlerts: number;
  /** Bucketed current risk level, or `null` when no assessment has been recorded yet. */
  riskLevel: SeverityLevel | null;
  className?: string;
}

export function PlantSafetyOverview({
  totalWorkers,
  activeSensors,
  activePermits,
  openAlerts,
  riskLevel,
  className,
}: PlantSafetyOverviewProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4', className)}>
      <StatCard label="Total Workers" value={totalWorkers} icon={HardHat} iconVariant="primary" />
      <StatCard label="Active Sensors" value={activeSensors} icon={Radio} iconVariant="primary" />
      <StatCard label="Active Permits" value={activePermits} icon={FileCheck2} iconVariant="warning" />
      <StatCard
        label="Open Alerts"
        value={openAlerts}
        icon={Bell}
        iconVariant={openAlerts > 0 ? 'danger' : 'success'}
      />
      <StatCard
        label="Current Risk Level"
        value={riskLevel ? capitalise(riskLevel) : 'Unknown'}
        icon={Gauge}
        iconVariant={riskLevel ? SEVERITY_BADGE_VARIANT[riskLevel] : 'neutral'}
      />
    </div>
  );
}
