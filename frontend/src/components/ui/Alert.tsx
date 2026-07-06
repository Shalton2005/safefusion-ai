/**
 * Alert
 *
 * Inline contextual feedback message with icon, optional title,
 * optional dismiss button, and an optional actions slot.
 *
 * Two display modes:
 *  - "subtle"  (default) — lightly tinted background + border
 *  - "accent"            — left accent-bar, neutral background
 *
 * @example
 * <Alert variant="danger" title="Connection lost">
 *   Unable to reach Sensor-A01. Check network connectivity.
 * </Alert>
 *
 * <Alert variant="warning" mode="accent" onClose={() => {}}>
 *   Firmware update available for 4 devices.
 * </Alert>
 */

import { type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
/** Display mode: tinted background (subtle) or accent bar (accent). @default 'subtle' */
export type AlertMode    = 'subtle' | 'accent';

// ─── Props ────────────────────────────────────────────────────────

export interface AlertProps {
  /** Semantic colour variant. @default 'info' */
  variant?: AlertVariant;
  /**
   * Visual display mode.
   * - subtle: tinted background with matching border
   * - accent: left colour bar on a neutral surface
   * @default 'subtle'
   */
  mode?: AlertMode;
  /** Bold heading above the body text */
  title?: string;
  /** Body content — string, markup, or any ReactNode */
  children: ReactNode;
  /**
   * When provided, renders a dismiss × button.
   * The consumer is responsible for hiding the Alert.
   */
  onClose?: () => void;
  /** Optional action buttons rendered below the body */
  actions?: ReactNode;
  className?: string;
}

// ─── Config ───────────────────────────────────────────────────────

interface VariantConfig {
  Icon:         React.ElementType;
  iconClass:    string;
  subtleBg:     string;
  subtleBorder: string;
  subtleText:   string;
  accentBar:    string;
}

const variantConfig: Record<AlertVariant, VariantConfig> = {
  info: {
    Icon:         Info,
    iconClass:    'text-sky-400',
    subtleBg:     'bg-sky-500/10',
    subtleBorder: 'border-sky-500/30',
    subtleText:   'text-sky-400',
    accentBar:    'bg-sky-500',
  },
  success: {
    Icon:         CheckCircle2,
    iconClass:    'text-safe-500',
    subtleBg:     'bg-safe-500/10',
    subtleBorder: 'border-safe-500/30',
    subtleText:   'text-safe-600 dark:text-safe-400',
    accentBar:    'bg-safe-500',
  },
  warning: {
    Icon:         TriangleAlert,
    iconClass:    'text-caution-500',
    subtleBg:     'bg-caution-500/10',
    subtleBorder: 'border-caution-500/30',
    subtleText:   'text-caution-600 dark:text-caution-400',
    accentBar:    'bg-caution-500',
  },
  danger: {
    Icon:         AlertCircle,
    iconClass:    'text-danger-500',
    subtleBg:     'bg-danger-500/10',
    subtleBorder: 'border-danger-500/30',
    subtleText:   'text-danger-600 dark:text-danger-400',
    accentBar:    'bg-danger-500',
  },
};

// ─── Component ────────────────────────────────────────────────────

export function Alert({
  variant  = 'info',
  mode     = 'subtle',
  title,
  children,
  onClose,
  actions,
  className,
}: AlertProps) {
  const { Icon, iconClass, subtleBg, subtleBorder, subtleText, accentBar } =
    variantConfig[variant];

  const isAccent = mode === 'accent';

  return (
    <div
      role="alert"
      className={cn(
        'relative flex gap-3 rounded-lg border text-sm animate-fade-in',
        // subtle mode
        !isAccent && [subtleBg, subtleBorder],
        // accent mode
        isAccent && [
          'bg-[var(--sf-surface-card)]',
          'border-[var(--sf-border-default)]',
          'pl-5', // extra left padding for the bar
        ],
        'px-4 py-3',
        className,
      )}
    >
      {/* Accent bar */}
      {isAccent && (
        <span
          className={cn(
            'absolute left-0 top-0 h-full w-1 rounded-l-lg',
            accentBar,
          )}
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <Icon
        className={cn(
          'w-4 h-4 flex-shrink-0 mt-0.5',
          iconClass,
        )}
        aria-hidden="true"
      />

      {/* Body */}
      <div className="flex-1 min-w-0">
        {title && (
          <p
            className={cn(
              'font-semibold leading-snug mb-0.5',
              !isAccent && subtleText,
              isAccent && 'text-[var(--sf-text-primary)]',
            )}
          >
            {title}
          </p>
        )}
        <p
          className={cn(
            'leading-relaxed',
            !isAccent && subtleText,
            isAccent && 'text-[var(--sf-text-secondary)]',
          )}
        >
          {children}
        </p>
        {actions && (
          <div className="mt-3 flex items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Dismiss */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className={cn(
            'flex-shrink-0 -mt-0.5 -mr-1 p-1 rounded-md',
            'opacity-60 hover:opacity-100 transition-opacity duration-100',
            'focus:outline-none focus-visible:ring-1',
            !isAccent && subtleText,
            isAccent && 'text-[var(--sf-text-tertiary)]',
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
