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
import { useNavigate } from 'react-router-dom';
import { StatCard } from '@/components/ui';
import type { StatCardProps } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { formatRelativeTime, capitalise } from '@/utils/format';
import type { DashboardSummary, ComplianceStatusSnapshot, CompoundRiskAssessment } from '@/types';

export interface KpiCardGridProps {
  dashboardSummary?: DashboardSummary | null;
  complianceSnapshot?: ComplianceStatusSnapshot | null;
  riskAssessment?: CompoundRiskAssessment | null;
  loading?: boolean;
  lastUpdated?: Date | null;
}

export function KpiCardGrid({ dashboardSummary, complianceSnapshot, riskAssessment, loading, lastUpdated }: KpiCardGridProps) {
  const navigate = useNavigate();
  const isLoading = loading || (!dashboardSummary && !complianceSnapshot);

  /** `null` when the risk engine hasn't persisted a reading yet — distinct from a confirmed low/zero score. */

  const timeStr = lastUpdated ? formatRelativeTime(lastUpdated.toISOString()) : 'Syncing...';

  const expiredPermits = complianceSnapshot?.non_compliant_count ?? 0;
  const activeViolations = complianceSnapshot?.incident_count ?? 0;

  const KPI_CARDS: StatCardProps[] = [
    {
      label: 'Compound Risk',
      value: isLoading ? '--' : `${riskAssessment?.risk_score ?? dashboardSummary?.overall_risk_score ?? 0}`,
      subLabel: '/ 100',
      delta: riskAssessment?.risk_level ? `${capitalise(riskAssessment.risk_level)} Risk` : undefined,
      trend: 'up',
      trendPositive: (riskAssessment?.risk_level === 'low'),
      icon: Gauge,
      iconVariant: (riskAssessment?.risk_level === 'critical' || riskAssessment?.risk_level === 'high') ? 'danger' : 'warning',
      lastUpdated: timeStr,
      actionLabel: 'View Report',
      onClick: () => navigate(ROUTES.REPORTS),
    },
    {
      label: 'Critical Alerts',
      value: isLoading ? '--' : (dashboardSummary?.critical_alerts ?? 0),
      trend: 'stable',
      trendPositive: (dashboardSummary?.critical_alerts ?? 0) === 0,
      icon: Bell,
      iconVariant: (dashboardSummary?.critical_alerts ?? 0) > 0 ? 'danger' : 'success',
      lastUpdated: timeStr,
      actionLabel: 'Go to Alerts',
      onClick: () => navigate(ROUTES.ALERTS),
    },
    {
      label: 'Workers Online',
      value: isLoading ? '-- / --' : `${dashboardSummary?.active_workers ?? 0} / ${dashboardSummary?.total_workers ?? 0}`,
      trend: 'stable',
      trendPositive: true,
      icon: HardHat,
      iconVariant: 'primary',
      lastUpdated: timeStr,
      actionLabel: 'View Roster',
      onClick: () => navigate(ROUTES.WORKERS),
    },
    {
      label: 'Compliance Status',
      value: isLoading ? '--' : (
        <div className="flex flex-col gap-1.5 mt-2 mb-2 w-full">
          <span className="text-lg font-bold text-danger-500 font-sans tracking-normal leading-tight">Requires Review</span>
          <div className="flex flex-col gap-1 font-sans text-xs mt-1">
            <span className="text-[var(--sf-text-secondary)] font-medium flex justify-between">Expired Permits: <span className="font-mono text-[var(--sf-text-primary)] font-bold">{expiredPermits}</span></span>
            <span className="text-[var(--sf-text-secondary)] font-medium flex justify-between">Active Violations: <span className="font-mono text-[var(--sf-text-primary)] font-bold">{activeViolations}</span></span>
            <span className="text-[var(--sf-text-secondary)] font-medium flex justify-between">Regulatory Reporting: <span className="text-caution-500 font-bold uppercase tracking-wider text-[10px] mt-0.5">Pending</span></span>
          </div>
        </div>
      ),
      trend: 'stable',
      trendPositive: false,
      icon: ShieldCheck,
      iconVariant: 'danger',
      lastUpdated: timeStr,
      actionLabel: 'Audit Details',
      onClick: () => navigate(ROUTES.REPORTS),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {KPI_CARDS.map((card) => (
        <StatCard key={card.label} {...card} className="h-full" />
      ))}
    </div>
  );
}
