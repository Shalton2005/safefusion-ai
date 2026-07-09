/**
 * RiskScoreWidget
 *
 * Reusable, presentational widget showing a numerical risk score, its
 * bucketed risk level (Low / Medium / High / Critical), and a trend
 * placeholder. Purely props-driven — no data fetching — so it can be
 * reused wherever an overall risk reading needs to be surfaced.
 *
 * Trend is rendered as a fixed placeholder until historical risk-score
 * tracking is wired up.
 *
 * @example
 * <RiskScoreWidget score={32} level="low" />
 */

import { Gauge, Minus } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { SeverityLevel } from '@/constants';

const iconVariantClass: Record<SeverityLevel, string> = {
  low:      'bg-safe-500/15    text-safe-500',
  medium:   'bg-primary-600/15 text-primary-400',
  high:     'bg-caution-500/15 text-caution-500',
  critical: 'bg-danger-500/15  text-danger-500',
};

export interface RiskScoreWidgetProps {
  /** Overall risk score, 0-100. */
  score: number;
  /** Bucketed risk level — drives the colour coding. */
  level: SeverityLevel;
  className?: string;
}

export function RiskScoreWidget({ score, level, className }: RiskScoreWidgetProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-5 rounded-xl',
        'bg-[var(--sf-surface-card)]',
        'border border-[var(--sf-border-default)]',
        'shadow-sf-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)] leading-none">
          Overall Risk Score
        </p>
        <div className={cn('flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl', iconVariantClass[level])}>
          <Gauge className="w-4.5 h-4.5" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold text-[var(--sf-text-primary)] leading-none tracking-tight font-mono">
            {score}
          </span>
          <span className="text-xs text-[var(--sf-text-tertiary)]">/ 100</span>
        </div>

        <Badge variant={SEVERITY_BADGE_VARIANT[level]} size="sm" dot pulsing={level === 'critical'} className="w-fit">
          {capitalise(level)}
        </Badge>

        {/* Trend placeholder — historical tracking not yet wired up */}
        <div className="flex items-center gap-1 text-xs font-medium text-[var(--sf-text-tertiary)]">
          <Minus className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>Trend unavailable</span>
        </div>
      </div>
    </div>
  );
}
