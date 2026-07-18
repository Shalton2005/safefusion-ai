/**
 * KpiCardGrid
 *
 * Responsive grid of the platform's top-level KPI cards.
 * Wraps the reusable `StatCard` primitive with SafeFusion's fixed
 * set of headline metrics, fed from live data via props.
 *
 * @example
 * <KpiCardGrid dashboardSummary={summary} analyticsSummary={analytics} plantSafetyOverview={overview} loading={loading} />
 */

import {
  Gauge,
  HardHat,
  Bell,
  FileCheck2,
  Radio,
  Wrench,
} from 'lucide-react';
import { StatCard } from '@/components/ui';
import type { StatCardProps } from '@/components/ui';
import type { DashboardSummary, AnalyticsSummary, PlantSafetyOverview } from '@/types';

export interface KpiCardGridProps {
  dashboardSummary?: DashboardSummary | null;
  analyticsSummary?: AnalyticsSummary | null;
  plantSafetyOverview?: PlantSafetyOverview | null;
  loading?: boolean;
}

export function KpiCardGrid({ dashboardSummary, analyticsSummary, plantSafetyOverview, loading }: KpiCardGridProps) {
  const isLoading = loading || (!dashboardSummary && !analyticsSummary && !plantSafetyOverview);

  const KPI_CARDS: StatCardProps[] = [
    {
      label: 'Overall Risk Score',
      value: isLoading ? '--' : `${dashboardSummary?.overall_risk_score ?? 0}`,
      subLabel: '/ 100',
      delta: undefined, // Deltas left empty when live data lacks history comparators
      deltaLabel: 'vs last week',
      trend: 'stable',
      trendPositive: true,
      icon: Gauge,
      iconVariant: (dashboardSummary?.overall_risk_score ?? 0) < 50 ? 'success' : 'warning',
    },
    {
      label: 'Workers Online',
      value: isLoading ? '-- / --' : `${dashboardSummary?.active_workers ?? 0} / ${dashboardSummary?.total_workers ?? 0}`,
      deltaLabel: 'since shift start',
      trend: 'up',
      trendPositive: true,
      icon: HardHat,
      iconVariant: 'primary',
    },
    {
      label: 'Critical Alerts',
      value: isLoading ? '--' : (dashboardSummary?.critical_alerts ?? 0),
      deltaLabel: 'in the last hour',
      trend: (dashboardSummary?.critical_alerts ?? 0) > 0 ? 'up' : 'stable',
      trendPositive: (dashboardSummary?.critical_alerts ?? 0) === 0,
      icon: Bell,
      iconVariant: (dashboardSummary?.critical_alerts ?? 0) > 0 ? 'danger' : 'success',
    },
    {
      label: 'Active Permits',
      value: isLoading ? '--' : (dashboardSummary?.active_permits ?? 0),
      deltaLabel: 'pending review',
      trend: 'stable',
      icon: FileCheck2,
      iconVariant: 'warning',
    },
    {
      label: 'Gas Sensors Active',
      value: isLoading ? '-- / --' : `${plantSafetyOverview?.active_sensors ?? 0} / ${analyticsSummary?.devicesTotal ?? 0}`,
      deltaLabel: 'offline',
      trend: 'down',
      trendPositive: false,
      icon: Radio,
      iconVariant: 'primary',
    },
    {
      label: 'Equipment Health',
      value: isLoading ? '--%' : `${Math.round(((analyticsSummary?.devicesOnline ?? 0) / Math.max(analyticsSummary?.devicesTotal || 1, 1)) * 100)}%`,
      deltaLabel: 'vs last month',
      trend: 'up',
      trendPositive: true,
      icon: Wrench,
      iconVariant: 'success',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {KPI_CARDS.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
