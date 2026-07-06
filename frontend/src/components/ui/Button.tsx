/**
 * Button
 *
 * Versatile action element supporting all visual variants, sizes,
 * loading states, icon slots, and icon-only mode.
 *
 * @example
 * // Standard
 * <Button variant="primary">Save changes</Button>
 *
 * // With icons
 * <Button leftIcon={<Plus className="w-4 h-4" />}>Add device</Button>
 *
 * // Icon-only (label visually hidden but read by screen readers)
 * <Button iconOnly aria-label="Delete record" variant="danger">
 *   <Trash2 className="w-4 h-4" />
 * </Button>
 *
 * // Loading
 * <Button loading>Saving…</Button>
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import type { Size, Variant } from '@/types';

// ─── Props ────────────────────────────────────────────────────────

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default 'primary' */
  variant?: Variant;
  /** Spatial size — controls height, padding, and font size. @default 'md' */
  size?: Size;
  /** Replaces content with a spinner and blocks interaction. @default false */
  loading?: boolean;
  /** Icon rendered before the label. */
  leftIcon?: React.ReactNode;
  /** Icon rendered after the label. */
  rightIcon?: React.ReactNode;
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  /**
   * Square icon-only button. children becomes a visually-hidden
   * accessible label for screen readers.
   * @default false
   */
  iconOnly?: boolean;
}

// ─── Style Maps ───────────────────────────────────────────────────

const variantMap: Record<Variant, string> = {
  primary: [
    'bg-primary-600 text-white shadow-sm',
    'hover:bg-primary-700 active:bg-primary-800',
    'focus-visible:ring-primary-500',
  ].join(' '),
  secondary: [
    'bg-[var(--sf-surface-raised)] text-[var(--sf-text-primary)]',
    'border border-[var(--sf-border-default)]',
    'hover:bg-[var(--sf-surface-overlay)] hover:border-[var(--sf-border-strong)]',
    'focus-visible:ring-primary-500',
  ].join(' '),
  success: [
    'bg-safe-600 text-white shadow-sm',
    'hover:bg-safe-700 active:bg-safe-800',
    'focus-visible:ring-safe-500',
  ].join(' '),
  warning: [
    'bg-caution-600 text-white shadow-sm',
    'hover:bg-caution-700 active:bg-caution-800',
    'focus-visible:ring-caution-500',
  ].join(' '),
  danger: [
    'bg-danger-600 text-white shadow-sm',
    'hover:bg-danger-700 active:bg-danger-800',
    'focus-visible:ring-danger-500',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--sf-text-secondary)]',
    'hover:bg-[var(--sf-surface-raised)] hover:text-[var(--sf-text-primary)]',
    'focus-visible:ring-primary-500',
  ].join(' '),
  outline: [
    'bg-transparent text-[var(--sf-text-primary)]',
    'border border-[var(--sf-border-default)]',
    'hover:bg-[var(--sf-surface-raised)] hover:border-[var(--sf-border-strong)]',
    'focus-visible:ring-primary-500',
  ].join(' '),
};

/** height · horizontal-padding · font-size · gap */
const sizeMap: Record<Size, string> = {
  xs: 'h-7  px-2.5 text-xs  gap-1',
  sm: 'h-8  px-3   text-sm  gap-1.5',
  md: 'h-10 px-4   text-sm  gap-2',
  lg: 'h-11 px-5   text-base gap-2',
  xl: 'h-12 px-6   text-base gap-2.5',
};

/** Square dimensions for icon-only buttons */
const iconSizeMap: Record<Size, string> = {
  xs: 'size-7',
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-11',
  xl: 'size-12',
};

// ─── Component ────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = 'primary',
      size      = 'md',
      loading   = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      iconOnly  = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        className={cn(
          'relative inline-flex items-center justify-center',
          'font-medium rounded-lg select-none whitespace-nowrap',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'focus-visible:ring-offset-[var(--sf-surface-base)]',
          'active:scale-[0.98]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variantMap[variant],
          iconOnly ? iconSizeMap[size] : sizeMap[size],
          !iconOnly && fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin w-4 h-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {!iconOnly && <span>{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>
            )}
            {iconOnly
              ? <span className="sr-only">{children}</span>
              : children
            }
            {rightIcon && (
              <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>
            )}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
