/**
 * StatCard
 *
 * Dashboard KPI card displaying a metric value, label, optional icon,
 * trend indicator, and loading skeleton state.
 *
 * @example
 * // Basic
 * <StatCard label="Safety Score" value="94%" />
 *
 * // With trend
 * <StatCard
 *   label="Active Alerts"
 *   value={7}
 *   delta="-3"
 *   deltaLabel="vs yesterday"
 *   trend="down"
 *   trendPositive={true}
 *   icon={Bell}
 *   iconVariant="danger"
 * />
 *
 * // Loading skeleton
 * <StatCard label="Devices Online" value="" loading />
 */

import { type ElementType } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Skeleton } from './Loader';

// ─── Types ────────────────────────────────────────────────────────

/** Direction of the trend indicator. */
export type TrendDirection = 'up' | 'down' | 'stable';

/** Background colour applied to the icon container. */
type StatCardIconVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

// ─── Props ────────────────────────────────────────────────────────

export interface StatCardProps {
  /** Metric value displayed in large text. Can be a formatted string ("94%") or a number. */
  value: string | number;
  /** Short label beneath the value (e.g. "Safety Score"). */
  label: string;
  /** Optional sub-label rendered beside / below the value. */
  subLabel?: string;
  /**
   * Change value displayed next to the trend icon (e.g. "+2.1%", "-3").
   * Omit to hide the trend row entirely.
   */
  delta?: string | number;
  /** Contextual label after the delta value (e.g. "from last week"). */
  deltaLabel?: string;
  /**
   * Direction of change — controls the trend icon.
   * @default 'stable'
   */
  trend?: TrendDirection;
  /**
   * When `true`, an upward trend is coloured green; downward is red.
   * When `false`, the inverse applies (e.g. for "active incidents" where
   * a decrease is positive).
   * @default true
   */
  trendPositive?: boolean;
  /**
   * Lucide icon component rendered in the top-right corner.
   * Pass the component reference: `icon={Bell}` not `icon={<Bell />}`.
   */
  icon?: ElementType;
  /** Background colour variant for the icon container. @default 'primary' */
  iconVariant?: StatCardIconVariant;
  /**
   * When `true`, replaces content with a pulsing skeleton.
   * @default false
   */
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

// ─── Style Maps ───────────────────────────────────────────────────

const iconVariantMap: Record<StatCardIconVariant, string> = {
  primary: 'bg-primary-600/15 text-primary-400',
  success: 'bg-safe-500/15    text-safe-500',
  warning: 'bg-caution-500/15 text-caution-500',
  danger:  'bg-danger-500/15  text-danger-500',
  neutral: 'bg-[var(--sf-surface-raised)] text-[var(--sf-text-tertiary)]',
};

function getTrendStyle(
  trend: TrendDirection,
  positive: boolean,
): { color: string; Icon: ElementType } {
  if (trend === 'stable') {
    return { color: 'text-[var(--sf-text-tertiary)]', Icon: Minus };
  }

  const isGood = (trend === 'up') === positive;

  return {
    color: isGood ? 'text-safe-500' : 'text-danger-500',
    Icon:  trend === 'up' ? TrendingUp : TrendingDown,
  };
}

// ─── Component ────────────────────────────────────────────────────

export function StatCard({
  value,
  label,
  subLabel,
  delta,
  deltaLabel,
  trend         = 'stable',
  trendPositive = true,
  icon: Icon,
  iconVariant   = 'primary',
  loading       = false,
  className,
  onClick,
}: StatCardProps) {
  const hasTrend = delta !== undefined && delta !== null;
  const { color: trendColor, Icon: TrendIcon } = getTrendStyle(trend, trendPositive);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={cn(
        'flex flex-col gap-3 p-5 rounded-xl',
        'bg-[var(--sf-surface-card)]',
        'border border-[var(--sf-border-default)]',
        'shadow-sf-card',
        onClick && [
          'cursor-pointer transition-all duration-200',
          'hover:-translate-y-px hover:shadow-card-hover',
          'hover:border-[var(--sf-border-strong)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sf-surface-base)]',
        ],
        className,
      )}
    >
      {/* ── Top row: label + icon ───────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)] leading-none">
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              'flex items-center justify-center flex-shrink-0',
              'w-9 h-9 rounded-xl',
              iconVariantMap[iconVariant],
            )}
          >
            <Icon className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* ── Value ───────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl font-extrabold text-[var(--sf-text-primary)] leading-none tracking-tight font-mono">
              {value}
            </span>
            {subLabel && (
              <span className="text-xs text-[var(--sf-text-tertiary)]">{subLabel}</span>
            )}
          </div>

          {/* Trend row */}
          {hasTrend && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
              <TrendIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span>{delta}</span>
              {deltaLabel && (
                <span className="text-[var(--sf-text-tertiary)] font-normal">{deltaLabel}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
