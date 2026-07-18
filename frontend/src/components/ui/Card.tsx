/**
 * Card
 *
 * Surface container with variant, padding, and hoverable support.
 * Use the Card sub-components (CardHeader, CardContent, CardFooter)
 * for consistent internal structure.
 *
 * @example
 * <Card variant="elevated" padding="md">
 *   <CardHeader title="Device Status" description="Zone A sensors" />
 *   <CardContent>…</CardContent>
 *   <CardFooter><Button size="sm">View all</Button></CardFooter>
 * </Card>
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────

/** Visual surface treatment. @default 'default' */
type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat' | 'inset';

/** Inner padding preset. @default 'md' */
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

// ─── Style Maps ───────────────────────────────────────────────────

const variantMap: Record<CardVariant, string> = {
  /** Standard card with border + light shadow */
  default: [
    'bg-[var(--sf-surface-card)]',
    'border border-[var(--sf-border-default)]',
    'shadow-sf-card',
  ].join(' '),
  /** Increased shadow, used for modals / floating panels */
  elevated: [
    'bg-[var(--sf-surface-card)]',
    'border border-[var(--sf-border-default)]',
    'shadow-sf-lg',
  ].join(' '),
  /** No shadow — border only */
  outlined: [
    'bg-[var(--sf-surface-card)]',
    'border-2 border-[var(--sf-border-default)]',
  ].join(' '),
  /** No border, no shadow — blends with the page surface */
  flat: 'bg-[var(--sf-surface-raised)]',
  /** Sunken / recessed appearance — used for wells and code blocks */
  inset: [
    'bg-[var(--sf-surface-sunken)]',
    'border border-[var(--sf-border-subtle)]',
    'shadow-inset',
  ].join(' '),
};

const paddingMap: Record<CardPadding, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

// ─── Card ─────────────────────────────────────────────────────────

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual surface treatment. @default 'default' */
  variant?: CardVariant;
  /** Inner padding preset. @default 'md' */
  padding?: CardPadding;
  /**
   * Applies hover elevation and pointer cursor.
   * Use on clickable cards.
   * @default false
   */
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant   = 'default',
      padding   = 'md',
      hoverable = false,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl',
        variantMap[variant],
        paddingMap[padding],
        hoverable && [
          'cursor-pointer transition-all duration-200',
          'hover:-translate-y-px hover:shadow-card-hover',
          'hover:border-[var(--sf-border-strong)]',
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

Card.displayName = 'Card';

// ─── CardHeader ───────────────────────────────────────────────────

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Primary heading text */
  title?: string;
  /** Supporting text beneath the title */
  description?: string;
  /** Node anchored to the right side (e.g. Badge, Button, menu trigger) */
  action?: React.ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 mb-4', className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {title && (
          <h3 className="text-sm font-semibold text-[var(--sf-text-primary)] leading-snug">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-0.5 text-xs text-[var(--sf-text-tertiary)] leading-relaxed">
            {description}
          </p>
        )}
        {children}
      </div>
      {action && (
        <div className="flex-shrink-0 flex items-center gap-2">{action}</div>
      )}
    </div>
  );
}

// ─── CardContent ──────────────────────────────────────────────────

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('text-sm text-[var(--sf-text-secondary)]', className)}
      {...props}
    >
      {children}
    </div>
  );
}
