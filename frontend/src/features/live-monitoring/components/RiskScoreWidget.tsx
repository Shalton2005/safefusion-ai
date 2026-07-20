/**
 * RiskScoreWidget
 *
 * Reusable, presentational widget showing a numerical risk score, its
 * bucketed risk level (Low / Medium / High / Critical), and a trend
 * indicator. Purely props-driven — no data fetching — so it can be
 * reused wherever an overall risk reading needs to be surfaced.
 *
 * `trend` is derived by the caller from persisted `risk_scores` history
 * (see `useRecentRiskScores`) by comparing the two most recent readings —
 * `null` when there isn't at least one prior reading to compare against.
 *
 * @example
 * <RiskScoreWidget score={32} level="low" trend="down" />
 */

import { Gauge, Minus, TrendingDown, TrendingUp } from 'lucide-react';
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

export type RiskScoreTrend = 'up' | 'down' | 'stable';

const TREND_ICON: Record<RiskScoreTrend, typeof Minus> = {
  up:      TrendingUp,
  down:    TrendingDown,
  stable:  Minus,
};

const TREND_LABEL: Record<RiskScoreTrend, string> = {
  up:      'Rising vs. previous reading',
  down:    'Falling vs. previous reading',
  stable:  'Stable vs. previous reading',
};

export interface RiskScoreWidgetProps {
  /** Overall risk score, 0-100. */
  score: number;
  /** Bucketed risk level — drives the colour coding. */
  level: SeverityLevel;
  /** Direction of change vs. the previous persisted reading, or `null` when there's no prior reading to compare against yet. */
  trend?: RiskScoreTrend | null;
  className?: string;
}

export function RiskScoreWidget({ score, level, trend = null, className }: RiskScoreWidgetProps) {
  const TrendIcon = trend ? TREND_ICON[trend] : Minus;
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

        <div className="flex items-center gap-1 text-xs font-medium text-[var(--sf-text-tertiary)]" title={trend ? TREND_LABEL[trend] : 'No prior reading to compare against yet'}>
          <TrendIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{trend ? TREND_LABEL[trend] : 'No trend data yet'}</span>
        </div>
      </div>
    </div>
  );
}
