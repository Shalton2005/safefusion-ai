/**
 * ComplianceDashboard
 *
 * Reusable, presentational compliance snapshot — displays overall status,
 * violated regulatory frameworks, and incident counts from a
 * `ComplianceStatusSnapshot`. Props-in only, no fetching, so it can be
 * dropped anywhere a compliance snapshot is already available (dashboard,
 * incident detail page, reports).
 *
 * @example
 * <ComplianceDashboard snapshot={snapshot} />
 */

import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { COMPLIANCE_STATUS_BADGE_VARIANT, COMPLIANCE_STATUS_LABEL } from '@/utils/severity';
import { Badge } from '@/components/ui';
import { ComplianceFrameworkBadge } from './ComplianceFrameworkBadge';
import type { ComplianceStatusSnapshot } from '@/types';

export interface ComplianceDashboardProps {
  snapshot: ComplianceStatusSnapshot;
  className?: string;
}

export function ComplianceDashboard({ snapshot, className }: ComplianceDashboardProps) {
  const { status, incident_count, non_compliant_count, violated_frameworks } = snapshot;
  const StatusIcon = status === 'compliant' ? ShieldCheck : ShieldAlert;

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Compliance Status */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)]">
          <span className="text-2xs font-medium uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Compliance Status
          </span>
          <Badge variant={COMPLIANCE_STATUS_BADGE_VARIANT[status]} size="md" dot pulsing={status === 'non_compliant'}>
            <StatusIcon className="w-3.5 h-3.5 mr-1" />
            {COMPLIANCE_STATUS_LABEL[status]}
          </Badge>
        </div>

        {/* Violated Rules (incident count that failed evaluation) */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)]">
          <span className="text-2xs font-medium uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Violated Rules
          </span>
          <span className="text-xl font-semibold text-[var(--sf-text-primary)]">
            {non_compliant_count}
            <span className="text-sm font-normal text-[var(--sf-text-tertiary)]"> / {incident_count} incidents</span>
          </span>
        </div>

        {/* Regulatory Authority */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] col-span-2 sm:col-span-1">
          <span className="text-2xs font-medium uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Regulatory Authority
          </span>
          {violated_frameworks.length === 0 ? (
            <span className="text-sm text-[var(--sf-text-tertiary)]">No frameworks violated</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {violated_frameworks.map((framework) => (
                <ComplianceFrameworkBadge key={framework} framework={framework} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
