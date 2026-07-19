/**
 * KpiCardGrid
 *
 * Responsive grid of the platform's top-level KPI cards.
 * Wraps the reusable `StatCard` primitive with SafeFusion's fixed
 * set of headline metrics, fed from live data via props.
 *
 * @example
 * <KpiCardGrid dashboardSummary={summary} complianceSnapshot={compliance} loading={loading} />
 */

import {
  Gauge,
  HardHat,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { StatCard } from '@/components/ui';
import type { StatCardProps } from '@/components/ui';
import type { DashboardSummary, ComplianceStatusSnapshot } from '@/types';

export interface KpiCardGridProps {
  dashboardSummary?: DashboardSummary | null;
  complianceSnapshot?: ComplianceStatusSnapshot | null;
  loading?: boolean;
  lastUpdated?: Date | null;
}

export function KpiCardGrid({ dashboardSummary, complianceSnapshot, loading, lastUpdated }: KpiCardGridProps) {
  const isLoading = loading || (!dashboardSummary && !complianceSnapshot);

  const complianceScore = complianceSnapshot
    ? Math.max(0, 100 - complianceSnapshot.non_compliant_count * 10 - complianceSnapshot.incident_count * 15)
    : 0;

  const timeStr = lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Syncing';

  const KPI_CARDS: StatCardProps[] = [
    {
      label: 'Overall Risk Score',
      value: isLoading ? '--' : `${dashboardSummary?.overall_risk_score ?? 0}`,
      subLabel: '/ 100',
      trend: 'stable',
      trendPositive: true,
      icon: Gauge,
      iconVariant: (dashboardSummary?.overall_risk_score ?? 0) < 50 ? 'success' : 'warning',
      lastUpdated: `Updated ${timeStr}`,
      actionLabel: 'View Report',
      onClick: () => {},
    },
    {
      label: 'Critical Alerts',
      value: isLoading ? '--' : (dashboardSummary?.critical_alerts ?? 0),
      trend: 'stable',
      trendPositive: (dashboardSummary?.critical_alerts ?? 0) === 0,
      icon: Bell,
      iconVariant: (dashboardSummary?.critical_alerts ?? 0) > 0 ? 'danger' : 'success',
      lastUpdated: `Updated ${timeStr}`,
      actionLabel: 'Go to Alerts',
      onClick: () => {},
    },
    {
      label: 'Workers Online',
      value: isLoading ? '-- / --' : `${dashboardSummary?.active_workers ?? 0} / ${dashboardSummary?.total_workers ?? 0}`,
      trend: 'stable',
      trendPositive: true,
      icon: HardHat,
      iconVariant: 'primary',
      lastUpdated: `Updated ${timeStr}`,
      actionLabel: 'View Roster',
      onClick: () => {},
    },
    {
      label: 'Compliance Score',
      value: isLoading ? '--%' : `${complianceScore}%`,
      trend: 'stable',
      trendPositive: complianceScore >= 90,
      icon: ShieldCheck,
      iconVariant: complianceScore >= 90 ? 'success' : 'warning',
      lastUpdated: `Updated ${timeStr}`,
      actionLabel: 'Audit Details',
      onClick: () => {},
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {KPI_CARDS.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
