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
  value: React.ReactNode;
  label: string;
  subLabel?: string;
  delta?: string | number;
  deltaLabel?: string;
  trend?: TrendDirection;
  trendPositive?: boolean;
  icon?: ElementType;
  iconVariant?: StatCardIconVariant;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  actionLabel?: string;
  lastUpdated?: string;
  sparklineData?: number[];
}

// ─── Style Maps ───────────────────────────────────────────────────

const iconVariantMap: Record<StatCardIconVariant, string> = {
  primary: 'bg-primary-600/15 text-primary-400',
  success: 'bg-safe-500/15    text-safe-500',
  warning: 'bg-caution-500/15 text-caution-500',
  danger:  'bg-danger-500/15  text-danger-500',
  neutral: 'bg-[var(--sf-surface-raised)] text-[var(--sf-text-tertiary)]',
};

const sparklineColorMap: Record<StatCardIconVariant, string> = {
  primary: '#3b82f6', // primary-500
  success: '#10b981', // safe-500
  warning: '#f59e0b', // caution-500
  danger:  '#ef4444', // danger-500
  neutral: '#6b7280',
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
  actionLabel,
  lastUpdated,
  sparklineData,
}: StatCardProps) {
  const hasTrend = delta !== undefined && delta !== null;
  const { color: trendColor, Icon: TrendIcon } = getTrendStyle(trend, trendPositive);

  // Simple SVG Sparkline generator
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 60;
    const height = 24;
    
    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible ml-auto opacity-80" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={sparklineColorMap[iconVariant]}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={cn(
        'flex flex-col p-4 rounded-xl relative overflow-hidden group',
        'bg-[var(--sf-surface-card)]',
        'border border-[var(--sf-border-default)]',
        onClick && [
          'cursor-pointer transition-all duration-300 ease-in-out',
          'hover:-translate-y-1 hover:shadow-sf-lg',
          'hover:border-[var(--sf-border-focus)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sf-surface-base)]',
        ],
        className,
      )}
    >
      {/* ── Top row: label + icon ───────────────────────────── */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div
              className={cn(
                'flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-lg',
                iconVariantMap[iconVariant],
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-secondary)] leading-none">
            {label}
          </p>
        </div>
        {lastUpdated && (
          <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--sf-text-tertiary)]">
            {lastUpdated}
          </span>
        )}
      </div>

      {/* ── Value & Sparkline ───────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2 mt-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      ) : (
        <div className="flex flex-col flex-1">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-[var(--sf-text-primary)] leading-none tracking-tight font-mono">
                {value}
              </span>
              {subLabel && (
                <span className="text-xs text-[var(--sf-text-tertiary)] ml-1 font-mono">{subLabel}</span>
              )}
            </div>
            {renderSparkline()}
          </div>

          {/* Trend & Action Row */}
          <div className="flex items-center justify-between mt-auto pt-4">
            {hasTrend ? (
              <div className={cn('flex items-center gap-1.5 text-xs font-medium', trendColor)}>
                <TrendIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                <span className="font-mono">{delta}</span>
                {deltaLabel && (
                  <span className="text-[var(--sf-text-tertiary)] font-normal ml-0.5">{deltaLabel}</span>
                )}
              </div>
            ) : <div />}

            {actionLabel && onClick && (
              <span className="text-xs font-medium text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-200">
                {actionLabel} &rarr;
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
