/**
 * CompoundRiskCard
 *
 * Reusable, presentational card summarising the AI compound risk
 * assessment: risk score, bucketed risk level, number of triggered
 * rules, and overall status. Purely props-driven — no data fetching —
 * so it can be dropped anywhere an at-a-glance compound risk reading
 * is needed. Pair with `CompoundRiskCardSection` for the fetching
 * wrapper.
 *
 * @example
 * <CompoundRiskCard
 *   riskScore={72.5}
 *   riskLevel="high"
 *   triggeredRulesCount={3}
 *   status="warning"
 * />
 */

import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { SeverityLevel } from '@/constants';
import type { RiskStatus } from '@/types';

const iconVariantClass: Record<SeverityLevel, string> = {
  low:      'bg-safe-500/15    text-safe-500',
  medium:   'bg-primary-600/15 text-primary-400',
  high:     'bg-caution-500/15 text-caution-500',
  critical: 'bg-danger-500/15  text-danger-500',
};

const STATUS_LABEL: Record<RiskStatus, string> = {
  safe:     'Safe',
  warning:  'Warning',
  critical: 'Critical',
};

const STATUS_BADGE_VARIANT: Record<RiskStatus, 'success' | 'warning' | 'danger'> = {
  safe:     'success',
  warning:  'warning',
  critical: 'danger',
};

export interface CompoundRiskCardProps {
  /** Overall compound risk score, 0-100. */
  riskScore: number;
  /** Bucketed risk level — drives the colour coding. */
  riskLevel: SeverityLevel;
  /** Number of rule-based factors that triggered across all zones. */
  triggeredRulesCount: number;
  /** Overall status derived from the risk level. */
  status: RiskStatus;
  className?: string;
}

export function CompoundRiskCard({
  riskScore,
  riskLevel,
  triggeredRulesCount,
  status,
  className,
}: CompoundRiskCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-5 rounded-xl',
        'bg-[var(--sf-surface-card)]',
        'border border-[var(--sf-border-default)]',
        'shadow-sf-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)] leading-none">
          Compound Risk
        </p>
        <div
          className={cn(
            'flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl',
            iconVariantClass[riskLevel],
          )}
        >
          <ShieldAlert className="w-4.5 h-4.5" aria-hidden="true" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Risk Score
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-[var(--sf-text-primary)] leading-none tracking-tight font-mono">
              {riskScore}
            </span>
            <span className="text-xs text-[var(--sf-text-tertiary)]">/ 100</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Risk Level
          </span>
          <Badge variant={SEVERITY_BADGE_VARIANT[riskLevel]} size="sm" dot pulsing={riskLevel === 'critical'} className="w-fit">
            {capitalise(riskLevel)}
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Triggered Rules
          </span>
          <span className="text-2xl font-extrabold text-[var(--sf-text-primary)] leading-none tracking-tight font-mono">
            {triggeredRulesCount}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
            Overall Status
          </span>
          <Badge variant={STATUS_BADGE_VARIANT[status]} size="sm" dot pulsing={status === 'critical'} className="w-fit">
            {STATUS_LABEL[status]}
          </Badge>
        </div>
      </div>
    </div>
  );
}
