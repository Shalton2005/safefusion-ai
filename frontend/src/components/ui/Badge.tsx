/**
 * Badge
 *
 * Compact status label with variant, optional dot pulse, and
 * optional remove button for tag-style usage.
 *
 * @example
 * <Badge variant="danger" dot>Critical</Badge>
 * <Badge variant="success" pulsing>Online</Badge>
 * <Badge variant="primary" removable onRemove={() => {}}>Zone A</Badge>
 */

import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Variant, Size } from '@/types';

// ─── Types ────────────────────────────────────────────────────────

export type BadgeVariant = Variant | 'default';
export type BadgeSize    = Extract<Size, 'sm' | 'md'>;

// ─── Props ────────────────────────────────────────────────────────

export interface BadgeProps {
  /** Visual colour variant. @default 'default' */
  variant?: BadgeVariant;
  /** Spatial size. @default 'md' */
  size?: BadgeSize;
  /**
   * Shows a filled circle before the label.
   * Colour matches the variant.
   */
  dot?: boolean;
  /**
   * Adds a persistent pulse animation to the dot indicator.
   * Intended for live / real-time status badges.
   * Requires `dot={true}`.
   */
  pulsing?: boolean;
  /**
   * Shows an × button after the label.
   * Use for removable filter tags.
   */
  removable?: boolean;
  /** Callback fired when the × button is clicked. */
  onRemove?: () => void;
  className?: string;
  children: React.ReactNode;
}

// ─── Style Maps ───────────────────────────────────────────────────

const variantMap: Record<BadgeVariant, { badge: string; dot: string }> = {
  default: {
    badge: 'bg-[var(--sf-surface-sunken)] text-[var(--sf-text-secondary)] border-[var(--sf-border-default)]',
    dot:   'bg-[var(--sf-text-tertiary)]',
  },
  primary: {
    badge: 'bg-primary-600/15 text-primary-400 border-primary-600/30',
    dot:   'bg-primary-400',
  },
  secondary: {
    badge: 'bg-[var(--sf-surface-sunken)] text-[var(--sf-text-secondary)] border-[var(--sf-border-default)]',
    dot:   'bg-[var(--sf-text-tertiary)]',
  },
  success: {
    badge: 'bg-safe-500/15 text-safe-600 dark:text-safe-400 border-safe-500/30',
    dot:   'bg-safe-500',
  },
  warning: {
    badge: 'bg-caution-500/15 text-caution-600 dark:text-caution-400 border-caution-500/30',
    dot:   'bg-caution-500',
  },
  danger: {
    badge: 'bg-danger-500/15 text-danger-600 dark:text-danger-400 border-danger-500/30',
    dot:   'bg-danger-500',
  },
  ghost: {
    badge: 'bg-transparent text-[var(--sf-text-tertiary)] border-transparent',
    dot:   'bg-[var(--sf-text-tertiary)]',
  },
  outline: {
    badge: 'bg-transparent text-[var(--sf-text-primary)] border-[var(--sf-border-default)]',
    dot:   'bg-[var(--sf-text-primary)]',
  },
};

const sizeMap: Record<BadgeSize, string> = {
  sm: 'text-2xs px-1.5 py-0.5 gap-1',
  md: 'text-xs  px-2   py-1   gap-1.5',
};

// ─── Component ────────────────────────────────────────────────────

export function Badge({
  variant  = 'default',
  size     = 'md',
  dot      = false,
  pulsing  = false,
  removable = false,
  onRemove,
  className,
  children,
}: BadgeProps) {
  const safeVariant = variantMap[variant] ? variant : 'default';
  const { badge: badgeClass, dot: dotClass } = variantMap[safeVariant];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        badgeClass,
        sizeMap[size],
        className,
      )}
    >
      {dot && (
        <span className="relative flex-shrink-0 flex items-center justify-center">
          {/* Pulse ring */}
          {pulsing && (
            <span
              className={cn(
                'absolute inline-flex rounded-full opacity-60 animate-ping',
                size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
                dotClass,
              )}
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              'rounded-full',
              size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
              dotClass,
            )}
            aria-hidden="true"
          />
        </span>
      )}

      <span>{children}</span>

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className={cn(
            '-mr-0.5 rounded-full opacity-60 hover:opacity-100',
            'transition-opacity duration-100',
            'focus:outline-none focus-visible:opacity-100',
          )}
        >
          <X className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
