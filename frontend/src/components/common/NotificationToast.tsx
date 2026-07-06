/**
 * NotificationToast – Global Toast Notification Container
 *
 * Reads from useNotificationStore and renders dismissable toasts in
 * the bottom-right corner of the viewport.  Mounted once inside
 * AppLayout so it is available on every route.
 *
 * Trigger a toast from anywhere:
 *   const { add } = useNotificationStore();
 *   add({ type: 'success', title: 'Saved', message: 'Changes saved.' });
 */

import { X, CheckCircle2, AlertCircle, Info, TriangleAlert } from 'lucide-react';
import { useNotificationStore, type NotificationType } from '@/store';
import { cn } from '@/lib/cn';

// ─── Per-type visual config ───────────────────────────────────────

interface ToastStyle {
  Icon:        React.ElementType;
  accentBar:   string;
  iconColor:   string;
}

const toastStyles: Record<NotificationType, ToastStyle> = {
  info: {
    Icon:      Info,
    accentBar: 'bg-[var(--sf-info)]',
    iconColor: 'text-[var(--sf-info-fg)]',
  },
  success: {
    Icon:      CheckCircle2,
    accentBar: 'bg-[var(--sf-safe)]',
    iconColor: 'text-[var(--sf-safe-fg)]',
  },
  warning: {
    Icon:      TriangleAlert,
    accentBar: 'bg-[var(--sf-warning)]',
    iconColor: 'text-[var(--sf-warning-fg)]',
  },
  error: {
    Icon:      AlertCircle,
    accentBar: 'bg-[var(--sf-danger)]',
    iconColor: 'text-[var(--sf-danger-fg)]',
  },
};

// ─── Individual Toast ─────────────────────────────────────────────

interface ToastItemProps {
  id:      string;
  type:    NotificationType;
  title:   string;
  message?: string;
}

function ToastItem({ id, type, title, message }: ToastItemProps) {
  const { dismiss } = useNotificationStore();
  const { Icon, accentBar, iconColor } = toastStyles[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'relative flex items-start gap-3 p-4 pl-5',
        'rounded-xl border border-[var(--sf-border-strong)]',
        'bg-[var(--sf-surface-overlay)] shadow-sf-xl',
        'pointer-events-auto animate-slide-in-up',
      )}
    >
      {/* Accent bar */}
      <span
        className={cn('absolute left-0 top-0 h-full w-1 rounded-l-xl', accentBar)}
        aria-hidden="true"
      />

      {/* Icon */}
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColor)} aria-hidden="true" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--sf-text-primary)] leading-snug">
          {title}
        </p>
        {message && (
          <p className="mt-0.5 text-xs text-[var(--sf-text-tertiary)] leading-relaxed">
            {message}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => dismiss(id)}
        aria-label="Dismiss notification"
        className={cn(
          'flex-shrink-0 p-1 rounded-md -mt-0.5 -mr-0.5',
          'text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)]',
          'hover:bg-[var(--sf-surface-raised)]',
          'transition-colors duration-100',
        )}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Toast Container ──────────────────────────────────────────────

export function NotificationToast() {
  const { notifications } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className={cn(
        'fixed bottom-4 right-4 z-[50]',
        'flex flex-col gap-2',
        'w-full max-w-[22rem]',
        'pointer-events-none',
      )}
    >
      {notifications.map((n) => (
        <ToastItem
          key={n.id}
          id={n.id}
          type={n.type}
          title={n.title}
          message={n.message}
        />
      ))}
    </div>
  );
}
