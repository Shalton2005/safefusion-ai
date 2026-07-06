/**
 * EmptyState
 *
 * Centred placeholder shown when a list, table, or content area is empty.
 * Supports an icon, heading, description, and a primary/secondary action.
 *
 * @example
 * // Basic
 * <EmptyState
 *   icon={Bell}
 *   title="No alerts"
 *   description="All systems are operating normally."
 * />
 *
 * // With action
 * <EmptyState
 *   icon={FileBarChart2}
 *   title="No reports yet"
 *   description="Generate your first report to see it here."
 *   action={<Button leftIcon={<Plus className="w-4 h-4" />}>Generate Report</Button>}
 * />
 */

import { type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────

export type EmptyStateSize = 'sm' | 'md' | 'lg';

// ─── Props ────────────────────────────────────────────────────────

export interface EmptyStateProps {
  /**
   * Lucide icon component rendered above the heading.
   * Pass the component reference, not a JSX element:
   * `icon={Bell}` not `icon={<Bell />}`
   */
  icon?: ElementType;
  /** Primary heading text. */
  title: string;
  /** Supporting description below the heading. */
  description?: string;
  /**
   * Primary CTA — typically a `<Button>`.
   * Rendered below the description.
   */
  action?: ReactNode;
  /** Secondary CTA — rendered beside the primary action. */
  secondaryAction?: ReactNode;
  /** Size preset that scales the icon, heading, and spacing. @default 'md' */
  size?: EmptyStateSize;
  className?: string;
}

// ─── Style Maps ───────────────────────────────────────────────────

const sizeConfig: Record<
  EmptyStateSize,
  { icon: string; iconWrap: string; title: string; desc: string; gap: string }
> = {
  sm: {
    icon:     'w-6 h-6',
    iconWrap: 'w-12 h-12 rounded-xl',
    title:    'text-sm font-semibold',
    desc:     'text-xs max-w-xs',
    gap:      'gap-3 py-8',
  },
  md: {
    icon:     'w-8 h-8',
    iconWrap: 'w-16 h-16 rounded-2xl',
    title:    'text-base font-semibold',
    desc:     'text-sm max-w-sm',
    gap:      'gap-4 py-12',
  },
  lg: {
    icon:     'w-10 h-10',
    iconWrap: 'w-20 h-20 rounded-2xl',
    title:    'text-lg font-semibold',
    desc:     'text-base max-w-md',
    gap:      'gap-5 py-16',
  },
};

// ─── Component ────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size      = 'md',
  className,
}: EmptyStateProps) {
  const cfg = sizeConfig[size];

  return (
    <div
      className={cn(
        'w-full flex flex-col items-center justify-center text-center',
        cfg.gap,
        className,
      )}
    >
      {/* Icon container */}
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center flex-shrink-0',
            'bg-[var(--sf-surface-raised)] border border-[var(--sf-border-default)]',
            cfg.iconWrap,
          )}
        >
          <Icon
            className={cn(cfg.icon, 'text-[var(--sf-text-tertiary)]')}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Text */}
      <div className="flex flex-col items-center gap-1.5">
        <h3 className={cn(cfg.title, 'text-[var(--sf-text-primary)]')}>{title}</h3>
        {description && (
          <p className={cn(cfg.desc, 'text-[var(--sf-text-tertiary)] leading-relaxed')}>
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
