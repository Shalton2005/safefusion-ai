/**
 * Loader  /  Skeleton
 *
 * Loader — animated loading indicator in three variants:
 *   - spinner  (default) — rotating circle
 *   - dots               — three bouncing dots
 *   - bar                — horizontal progress bar shimmer
 *
 * Skeleton — rectangular placeholder block for content that is
 * still loading (replaces ghost text / image areas).
 *
 * @example
 * // Spinner inside a button
 * <Loader size="sm" />
 *
 * // Full-screen overlay
 * <Loader size="lg" overlay label="Loading dashboard…" />
 *
 * // Dots variant
 * <Loader variant="dots" size="md" />
 *
 * // Skeleton placeholder
 * <Skeleton className="h-4 w-3/4 rounded" />
 */

import { cn } from '@/lib/cn';
import type { Size } from '@/types';

// ─── Types ────────────────────────────────────────────────────────

type LoaderVariant = 'spinner' | 'dots' | 'bar';

// ─── Props ────────────────────────────────────────────────────────

export interface LoaderProps {
  /** Animation style. @default 'spinner' */
  variant?: LoaderVariant;
  /** Spatial size. @default 'md' */
  size?: Size;
  /** Accessible label (also renders as visible text below the indicator). */
  label?: string;
  /**
   * Renders as a fixed full-screen overlay with a frosted backdrop.
   * Use to block interaction during async operations.
   * @default false
   */
  overlay?: boolean;
  className?: string;
}

// ─── Style Maps ───────────────────────────────────────────────────

const spinnerSizeMap: Record<Size, string> = {
  xs: 'w-4  h-4  border-2',
  sm: 'w-5  h-5  border-2',
  md: 'w-8  h-8  border-[3px]',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
};

const dotSizeMap: Record<Size, string> = {
  xs: 'w-1   h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-2   h-2',
  lg: 'w-3   h-3',
  xl: 'w-4   h-4',
};

const barHeightMap: Record<Size, string> = {
  xs: 'h-0.5',
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
  xl: 'h-3',
};

// ─── Component ────────────────────────────────────────────────────

export function Loader({
  variant = 'spinner',
  size    = 'md',
  label,
  overlay = false,
  className,
}: LoaderProps) {
  const indicator = (() => {
    if (variant === 'spinner') {
      return (
        <div
          className={cn(
            'rounded-full border-solid',
            'border-primary-600 border-t-transparent',
            'animate-spin flex-shrink-0',
            spinnerSizeMap[size],
          )}
        />
      );
    }

    if (variant === 'dots') {
      return (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'rounded-full bg-primary-500 animate-bounce',
                dotSizeMap[size],
                i === 1 && '[animation-delay:0.15s]',
                i === 2 && '[animation-delay:0.3s]',
              )}
              aria-hidden="true"
            />
          ))}
        </div>
      );
    }

    // bar
    return (
      <div
        className={cn(
          'w-full max-w-xs overflow-hidden rounded-full',
          'bg-[var(--sf-surface-raised)]',
          barHeightMap[size],
        )}
      >
        <div
          className={cn(
            'h-full rounded-full bg-primary-500',
            'animate-shimmer bg-gradient-to-r',
            'from-primary-700 via-primary-400 to-primary-700',
            'bg-[length:200%_100%]',
          )}
        />
      </div>
    );
  })();

  const content = (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        overlay && [
          'fixed inset-0 z-50',
          'bg-[var(--sf-surface-base)]/80 backdrop-blur-sm',
        ],
        className,
      )}
    >
      {indicator}
      {label && (
        <span className="text-sm text-[var(--sf-text-tertiary)]">{label}</span>
      )}
      <span className="sr-only">{label ?? 'Loading'}</span>
    </div>
  );

  return content;
}

// ─── Skeleton ─────────────────────────────────────────────────────

export interface SkeletonProps {
  className?: string;
}

/**
 * Rectangular shimmer block used as a loading placeholder.
 *
 * @example
 * <Skeleton className="h-4 w-3/4 rounded" />
 * <Skeleton className="w-10 h-10 rounded-full" />
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-[var(--sf-surface-overlay)]',
        className,
      )}
    />
  );
}
