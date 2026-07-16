/**
 * ConfidenceMeter
 *
 * Horizontal progress meter showing the AI Supervisor's overall
 * confidence — the proportion of supervised agents currently
 * reporting successfully (not a model-confidence score; see
 * `AISupervisorSnapshot.overallConfidence`). Tier thresholds come from
 * `utils/statusColor`'s `confidenceTier`, shared with `ConfidenceGauge`
 * so the two can never disagree on where a value crosses tiers.
 *
 * @example
 * <ConfidenceMeter confidence={75} />
 */

import { cn } from '@/lib/cn';
import { confidenceTier } from '../utils/statusColor';

export interface ConfidenceMeterProps {
  /** 0-100. */
  confidence: number;
  className?: string;
}

const TIER_BAR_CLASS: Record<ReturnType<typeof confidenceTier>, string> = {
  safe: 'bg-safe-500',
  caution: 'bg-caution-500',
  danger: 'bg-danger-500',
};

export function ConfidenceMeter({ confidence, className }: ConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(100, confidence));

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
          Overall Confidence
        </span>
        <span className="text-sm font-bold text-[var(--sf-text-primary)] font-mono">
          {clamped}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full h-2 rounded-full bg-[var(--sf-surface-sunken)] overflow-hidden"
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', TIER_BAR_CLASS[confidenceTier(clamped)])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
