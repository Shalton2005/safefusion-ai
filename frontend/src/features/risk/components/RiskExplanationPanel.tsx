/**
 * RiskExplanationPanel
 *
 * Reusable, presentational panel showing why a compound risk
 * assessment landed where it did: the triggered rules, the backend's
 * human-readable explanation (if it recorded one), and the full
 * contributing-factor breakdown. Purely props-driven — every value
 * displayed comes from the backend response, nothing is generated
 * client-side. Pair with `RiskExplanationPanelSection` for the
 * fetching wrapper.
 *
 * @example
 * <RiskExplanationPanel
 *   zone="Distillation-Unit"
 *   riskLevel="high"
 *   triggeredRules={[{ name: 'critical_sensors', detail: '2/5 sensors critical' }]}
 *   explanation={null}
 *   contributingFactors={[{ name: 'critical_sensors', points: 30, weight: 40, detail: '2/5 sensors critical' }]}
 * />
 */

import { ListChecks, FileText, SlidersHorizontal } from 'lucide-react';
import { Badge, EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { SeverityLevel } from '@/constants';
import type { RiskFactorContribution, TriggeredRule } from '@/types';

export interface RiskExplanationPanelProps {
  /** Zone this explanation applies to. */
  zone: string;
  /** Bucketed risk level — drives the header badge colour. */
  riskLevel: SeverityLevel;
  /** Rules the engine reports as triggered for this zone. */
  triggeredRules: TriggeredRule[];
  /** Backend-authored free-text explanation, or `null` if none was recorded. */
  explanation: string | null;
  /** Full contributing-factor breakdown (name, points, weight, detail). */
  contributingFactors: RiskFactorContribution[];
  className?: string;
}

function SectionHeading({ icon: Icon, children }: { icon: typeof ListChecks; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)]">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
}

export function RiskExplanationPanel({
  zone,
  riskLevel,
  triggeredRules,
  explanation,
  contributingFactors,
  className,
}: RiskExplanationPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 p-5 rounded-xl',
        'bg-[var(--sf-surface-card)]',
        'border border-[var(--sf-border-default)]',
        'shadow-sf-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-[var(--sf-text-primary)] leading-snug">
            Risk Explanation
          </h3>
          <p className="text-xs text-[var(--sf-text-tertiary)]">{zone}</p>
        </div>
        <Badge variant={SEVERITY_BADGE_VARIANT[riskLevel]} size="sm" dot pulsing={riskLevel === 'critical'}>
          {capitalise(riskLevel)}
        </Badge>
      </div>

      {/* Triggered Rules */}
      <div className="flex flex-col gap-2">
        <SectionHeading icon={ListChecks}>Triggered Rules ({triggeredRules.length})</SectionHeading>
        {triggeredRules.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No rules were triggered for this zone.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {triggeredRules.map((rule) => (
              <li
                key={rule.name}
                className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]"
              >
                <span className="text-sm font-medium text-[var(--sf-text-primary)]">{rule.name}</span>
                <span className="text-xs text-[var(--sf-text-tertiary)]">{rule.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Human-readable Explanation */}
      <div className="flex flex-col gap-2">
        <SectionHeading icon={FileText}>Explanation</SectionHeading>
        {explanation ? (
          <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">{explanation}</p>
        ) : (
          <EmptyState
            icon={FileText}
            title="No explanation recorded"
            description="The backend has not recorded a human-readable explanation for this assessment."
            size="sm"
          />
        )}
      </div>

      {/* Contributing Factors */}
      <div className="flex flex-col gap-2">
        <SectionHeading icon={SlidersHorizontal}>Contributing Factors ({contributingFactors.length})</SectionHeading>
        {contributingFactors.length === 0 ? (
          <p className="text-sm text-[var(--sf-text-tertiary)]">No contributing factors were reported.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {contributingFactors.map((factor) => (
              <li
                key={factor.name}
                className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-subtle)]"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-[var(--sf-text-primary)]">{factor.name}</span>
                  <span className="text-xs text-[var(--sf-text-tertiary)] leading-relaxed">{factor.detail}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0 text-right">
                  <span className="text-sm font-mono font-semibold text-[var(--sf-text-primary)]">
                    +{factor.points.toFixed(1)}
                  </span>
                  <span className="text-2xs text-[var(--sf-text-tertiary)]">weight {factor.weight}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
