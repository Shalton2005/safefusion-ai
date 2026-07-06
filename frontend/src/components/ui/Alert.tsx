import { type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Variant } from '@/types';

type AlertVariant = Extract<Variant, 'primary' | 'success' | 'warning' | 'danger'> | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

const config: Record<AlertVariant, {
  icon: React.ElementType;
  wrapper: string;
  icon_: string;
}> = {
  info: {
    icon:    Info,
    wrapper: 'bg-primary-600/10 border-primary-600/30 text-primary-400',
    icon_:   'text-primary-400',
  },
  primary: {
    icon:    Info,
    wrapper: 'bg-primary-600/10 border-primary-600/30 text-primary-400',
    icon_:   'text-primary-400',
  },
  success: {
    icon:    CheckCircle2,
    wrapper: 'bg-safe-500/10 border-safe-500/30 text-safe-600 dark:text-safe-500',
    icon_:   'text-safe-500',
  },
  warning: {
    icon:    TriangleAlert,
    wrapper: 'bg-caution-500/10 border-caution-500/30 text-caution-600 dark:text-caution-500',
    icon_:   'text-caution-500',
  },
  danger: {
    icon:    AlertCircle,
    wrapper: 'bg-danger-500/10 border-danger-500/30 text-danger-600 dark:text-danger-500',
    icon_:   'text-danger-500',
  },
};

export function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  const { icon: Icon, wrapper, icon_ } = config[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border px-4 py-3 text-sm animate-fade-in',
        wrapper,
        className,
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', icon_)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p className="leading-relaxed opacity-90">{children}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss alert"
          className="flex-shrink-0 -mt-0.5 -mr-1 p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
