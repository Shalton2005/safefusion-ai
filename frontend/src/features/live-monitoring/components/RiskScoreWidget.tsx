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

import { Minus, TrendingDown, TrendingUp, BrainCircuit } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { SeverityLevel } from '@/constants';


export type RiskScoreTrend = 'up' | 'down' | 'stable';

const TREND_ICON: Record<RiskScoreTrend, typeof Minus> = {
  up:      TrendingUp,
  down:    TrendingDown,
  stable:  Minus,
};

const TREND_COLOR: Record<RiskScoreTrend, string> = {
  up:      'text-danger-500',
  down:    'text-safe-500',
  stable:  'text-[var(--sf-text-secondary)]',
};


export interface RiskScoreWidgetProps {
  /** Overall risk score, 0-100. */
  score: number;
  /** Bucketed risk level — drives the colour coding. */
  level: SeverityLevel;
  /** Direction of change vs. the previous persisted reading. */
  trend?: RiskScoreTrend | null;
  /** Trend numerical value. Defaults to "+12" for visual demo. */
  trendValue?: string;
  /** Trend timeframe. Defaults to "Last 5 minutes". */
  trendTimeframe?: string;
  /** AI generated explanation. Defaults to mockup text. */
  explanation?: string;
  className?: string;
}

export function RiskScoreWidget({ 
  score, 
  level, 
  trend = 'up', 
  trendValue = '+12',
  trendTimeframe = 'Last 5 minutes',
  explanation = 'Compound risk increased due to simultaneous gas leak and active permit.',
  className 
}: RiskScoreWidgetProps) {
  // If we receive a score of 0 and it's just loading or nominal, we show 0, 
  // but to match the design request, we can use the passed score.
  const TrendIcon = trend ? TREND_ICON[trend] : Minus;
  const trendColor = trend ? TREND_COLOR[trend] : 'text-[var(--sf-text-tertiary)]';
  const isCritical = level === 'critical';

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <BrainCircuit className={cn("w-4 h-4", isCritical ? "text-danger-400" : "text-primary-400")} />
           <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)] leading-none">
             AI Risk Score
           </p>
        </div>
        <Badge variant={SEVERITY_BADGE_VARIANT[level]} size="sm" dot pulsing={isCritical}>
          {capitalise(level)}
        </Badge>
      </div>

      <div className="flex items-end justify-between mt-1">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-5xl font-extrabold leading-none tracking-tighter font-mono", 
            isCritical ? "text-danger-500" : "text-[var(--sf-text-primary)]"
          )}>
            {score}
          </span>
          <span className="text-sm font-mono text-[var(--sf-text-tertiary)]">/ 100</span>
        </div>
        
        <div className="flex flex-col items-end">
          <div className={cn("flex items-center gap-1 font-bold text-sm", trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span>{trendValue}</span>
          </div>
          <span className="text-2xs uppercase tracking-widest text-[var(--sf-text-tertiary)] mt-1">
            {trendTimeframe}
          </span>
        </div>
      </div>

      {/* Mini sparkline */}
      <div className="h-12 w-full mt-2 relative overflow-hidden rounded flex items-end">
        <div className={cn("absolute inset-0 bg-gradient-to-t to-transparent", isCritical ? "from-danger-500/10" : "from-primary-500/10")} />
        <svg className={cn("w-full h-full", isCritical ? "text-danger-500" : "text-primary-500")} preserveAspectRatio="none" viewBox="0 0 100 24">
          <path d="M0,24 L0,20 Q10,18 20,16 T40,10 T60,6 T80,0 T100,2 L100,24 Z" fill="currentColor" fillOpacity="0.1" />
          <path d="M0,20 Q10,18 20,16 T40,10 T60,6 T80,0 T100,2" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {/* AI Explanation */}
      <div className={cn("mt-1 p-3 rounded-lg border", 
        isCritical ? "bg-danger-500/5 border-danger-500/10" : "bg-[var(--sf-surface-sunken)] border-[var(--sf-border-subtle)]"
      )}>
        <p className="text-xs text-[var(--sf-text-secondary)] leading-relaxed">
          <span className={cn("font-semibold", isCritical ? "text-danger-400" : "text-primary-400")}>AI Analysis: </span>
          {explanation}
        </p>
      </div>
    </div>
  );
}
